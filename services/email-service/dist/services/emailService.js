"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const nodemailer_1 = __importDefault(require("nodemailer"));
const handlebars_1 = __importDefault(require("handlebars"));
const bull_1 = __importDefault(require("bull"));
// Constants for email queue configuration
const EMAIL_QUEUE_NAME = "email-queue";
const EMAIL_QUEUE_CONCURRENCY = parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || "5", 10);
const EMAIL_RETRY_ATTEMPTS = parseInt(process.env.EMAIL_RETRY_ATTEMPTS || "3", 10);
const EMAIL_RETRY_DELAY = parseInt(process.env.EMAIL_RETRY_DELAY || "60000", 10); // 1 minute in ms
const EMAIL_JOB_TIMEOUT = parseInt(process.env.EMAIL_JOB_TIMEOUT || "30000", 10); // 30 seconds
// Company name for email templates
const COMPANY_NAME = process.env.COMPANY_NAME || "Medh Learning Platform";
const readFileAsync = (0, util_1.promisify)(fs_1.default.readFile);
/**
 * Email Service
 * Handles email operations with Redis-based queuing
 */
class EmailService {
    constructor() {
        // Initialize SMTP transporter
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.EMAIL_HOST || "smtp.gmail.com",
            port: parseInt(process.env.EMAIL_PORT || "587", 10),
            secure: process.env.EMAIL_SECURE === "true" || false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            // Set connection pool settings for better performance
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            // Set timeouts
            connectionTimeout: 10000, // 10 seconds
            socketTimeout: 30000, // 30 seconds
        });
        // Initialize template cache
        this.templateCache = new Map();
        // Register Handlebars helpers
        handlebars_1.default.registerHelper('currentYear', () => new Date().getFullYear());
        // Initialize the email queue if Redis is configured
        this.queue = null;
        this.initializeQueue();
        // Verify connection
        this.verifyConnection();
    }
    /**
     * Initialize email queue with Bull and Redis
     */
    initializeQueue() {
        try {
            if (process.env.REDIS_HOST) {
                // Configure Bull queue with Redis options
                this.queue = new bull_1.default(EMAIL_QUEUE_NAME, {
                    redis: {
                        host: process.env.REDIS_HOST || "localhost",
                        port: parseInt(process.env.REDIS_PORT || "6379", 10),
                        password: process.env.REDIS_PASSWORD,
                    },
                    defaultJobOptions: {
                        attempts: EMAIL_RETRY_ATTEMPTS,
                        backoff: {
                            type: "exponential",
                            delay: EMAIL_RETRY_DELAY,
                        },
                        timeout: EMAIL_JOB_TIMEOUT,
                        removeOnComplete: true,
                        removeOnFail: process.env.EMAIL_KEEP_FAILED_JOBS !== "true",
                    },
                });
                // Process emails from the queue
                this.queue.process(EMAIL_QUEUE_CONCURRENCY, async (job) => {
                    const { mailOptions } = job.data;
                    return this.sendEmailDirectly(mailOptions);
                });
                // Add event listeners to queue for monitoring
                this.setupQueueListeners();
                console.log("Email queue initialized successfully");
            }
            else {
                console.log("Redis not configured - Using direct email sending without queuing");
            }
        }
        catch (error) {
            console.error("Failed to initialize email queue", { error });
        }
    }
    /**
     * Setup queue event listeners for monitoring and logging
     */
    setupQueueListeners() {
        if (!this.queue)
            return;
        this.queue.on("error", (error) => {
            console.error("Email queue error", { error });
        });
        this.queue.on("failed", (job, error) => {
            const { to, subject } = job.data.mailOptions;
            console.error(`Failed to send email to ${to}`, {
                error,
                subject,
                attemptsMade: job.attemptsMade,
            });
        });
        this.queue.on("completed", (job) => {
            const { to, subject } = job.data.mailOptions;
            console.log(`Successfully sent queued email to ${to}`, { subject });
        });
        // Monitor queue health periodically
        setInterval(async () => {
            try {
                if (this.queue) {
                    const jobCounts = await this.queue.getJobCounts();
                    console.debug("Email queue status", { jobCounts });
                }
            }
            catch (error) {
                console.error("Failed to get queue statistics", { error });
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }
    /**
     * Verify the email service connection
     */
    verifyConnection() {
        this.transporter.verify((error, success) => {
            if (error) {
                console.error("Email configuration error:", { error });
            }
            else {
                console.log("Email server is ready to send messages");
            }
        });
    }
    /**
     * Load and compile an email template
     * @param {string} templateName - Template file name without extension
     * @returns {Promise<Function>} Compiled template function
     */
    async loadTemplate(templateName) {
        // Check if template is cached
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName);
        }
        try {
            // Look for template in templates directory
            const templatePath = path_1.default.join(__dirname, "../templates", `${templateName}.hbs`);
            const templateSource = await readFileAsync(templatePath, "utf8");
            // Compile template
            const template = handlebars_1.default.compile(templateSource);
            // Cache template
            this.templateCache.set(templateName, template);
            return template;
        }
        catch (error) {
            console.error(`Failed to load email template: ${templateName}`, { error });
            throw new Error(`Email template not found: ${templateName}`);
        }
    }
    /**
     * Render email content using template and data
     * @param {string} templateName - Template name
     * @param {Object} data - Template data
     * @returns {Promise<string>} Rendered HTML
     */
    async renderTemplate(templateName, data) {
        try {
            // Add common data to all templates
            const templateData = {
                ...data,
                companyName: COMPANY_NAME,
                currentYear: new Date().getFullYear(),
            };
            const template = await this.loadTemplate(templateName);
            return template(templateData);
        }
        catch (error) {
            console.error(`Failed to render email template: ${templateName}`, { error, data });
            throw error;
        }
    }
    /**
     * Send an email directly or through queue
     * @param {MailOptions} mailOptions - Nodemailer mail options
     * @param {EmailQueueOptions} options - Additional options
     * @returns {Promise<object>} Send result
     */
    async sendEmail(mailOptions, options = {}) {
        try {
            const { priority = "normal", skipQueue = false } = options;
            // Validate email options
            if (!mailOptions.to || !mailOptions.subject) {
                throw new Error("Missing required email fields (to, subject)");
            }
            // Set default from address if not provided
            if (!mailOptions.from) {
                mailOptions.from = process.env.EMAIL_FROM || `${COMPANY_NAME} <noreply@example.com>`;
            }
            // Log the email being sent
            console.log(`Sending email to ${mailOptions.to}`, {
                subject: mailOptions.subject,
                skipQueue,
            });
            // If Redis queue is not available or skip queue is requested, send directly
            if (!this.queue || skipQueue) {
                return await this.sendEmailDirectly(mailOptions);
            }
            // Otherwise, queue the email
            return await this.queueEmail(mailOptions, { priority, ...options });
        }
        catch (error) {
            console.error(`Failed to send email to ${mailOptions.to}`, {
                error: error.message,
                subject: mailOptions.subject,
            });
            throw error;
        }
    }
    /**
     * Send a welcome email to new user
     * @param {string} email - Recipient email
     * @param {string} fullName - Recipient name
     * @param {Object} userData - Additional user data
     * @returns {Promise<object>} Email sending result
     */
    async sendWelcomeEmail(email, fullName, userData = {}) {
        try {
            // For now, send a plain HTML email if template is not available
            let html = `
        <h1>Welcome to ${COMPANY_NAME}, ${fullName}!</h1>
        <p>Thank you for joining us. We're excited to have you on board.</p>
        <p>Your account has been created with the email: ${email}</p>
      `;
            // Try to use template if available
            try {
                html = await this.renderTemplate("welcome", {
                    name: fullName,
                    email,
                    ...userData,
                });
            }
            catch (templateError) {
                console.warn("Welcome email template not found, using fallback HTML");
            }
            const mailOptions = {
                to: email,
                subject: `Welcome to ${COMPANY_NAME}`,
                html,
            };
            return this.sendEmail(mailOptions, { priority: "high" });
        }
        catch (error) {
            console.error("Failed to send welcome email", { error, email });
            throw error;
        }
    }
    /**
     * Send password reset email
     * @param {string} email - Recipient email
     * @param {string} name - Recipient name
     * @param {string} resetToken - Password reset token or link
     * @returns {Promise<object>} Email sending result
     */
    async sendPasswordResetEmail(email, name, resetToken) {
        try {
            // Default HTML fallback
            let html = `
        <h1>Password Reset Request</h1>
        <p>Hello ${name},</p>
        <p>You requested a password reset. Use the following token to reset your password:</p>
        <p><strong>${resetToken}</strong></p>
        <p>This token will expire in 24 hours.</p>
        <p>If you didn't request this change, please ignore this email.</p>
      `;
            // Try to use template if available
            try {
                html = await this.renderTemplate("reset-password", {
                    name,
                    email,
                    resetToken,
                    expiryHours: process.env.PASSWORD_RESET_EXPIRY_HOURS || 24,
                });
            }
            catch (templateError) {
                console.warn("Password reset template not found, using fallback HTML");
            }
            const mailOptions = {
                to: email,
                subject: `Password Reset - ${COMPANY_NAME}`,
                html,
            };
            return this.sendEmail(mailOptions, { priority: "high" });
        }
        catch (error) {
            console.error("Failed to send password reset email", { error, email });
            throw error;
        }
    }
    /**
     * Send verification email with OTP
     * @param {string} email - Recipient email
     * @param {string} name - Recipient name
     * @param {string} otp - One-time password or verification code
     * @returns {Promise<object>} Email sending result
     */
    async sendVerificationEmail(email, name, otp) {
        try {
            // Default HTML fallback
            let html = `
        <h1>Email Verification</h1>
        <p>Hello ${name},</p>
        <p>Please verify your email with the following code:</p>
        <p><strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `;
            // Try to use template if available
            try {
                html = await this.renderTemplate("email-verification", {
                    name,
                    email,
                    otp,
                    expiryMinutes: process.env.OTP_EXPIRY_MINUTES || 10,
                });
            }
            catch (templateError) {
                console.warn("Verification email template not found, using fallback HTML");
            }
            const mailOptions = {
                to: email,
                subject: `Verify Your Email - ${COMPANY_NAME}`,
                html,
            };
            return this.sendEmail(mailOptions, { priority: "high" });
        }
        catch (error) {
            console.error("Failed to send verification email", { error, email });
            throw error;
        }
    }
    /**
     * Send a notification email
     * @param {string} email - Recipient email
     * @param {string} subject - Email subject
     * @param {string} message - Notification message
     * @param {Object} data - Additional data for template
     * @returns {Promise<object>} Email sending result
     */
    async sendNotificationEmail(email, subject, message, data = {}) {
        try {
            // Default HTML fallback
            let html = `
        <h1>${subject}</h1>
        <p>${message}</p>
      `;
            // Try to use template if available
            try {
                html = await this.renderTemplate("notification", {
                    name: data.name,
                    message,
                    subject,
                    ...data,
                });
            }
            catch (templateError) {
                console.warn("Notification template not found, using fallback HTML");
            }
            const mailOptions = {
                to: email,
                subject,
                html,
            };
            return this.sendEmail(mailOptions);
        }
        catch (error) {
            console.error("Failed to send notification email", { error, email, subject });
            throw error;
        }
    }
    /**
     * Send an email directly (bypassing the queue)
     * @param {MailOptions} mailOptions - Email options
     * @returns {Promise<object>} Email sending result
     */
    async sendEmailDirectly(mailOptions) {
        const recipient = typeof mailOptions.to === "string"
            ? mailOptions.to
            : Array.isArray(mailOptions.to)
                ? mailOptions.to.join(", ")
                : "unknown";
        try {
            console.log(`Sending email directly to ${recipient}`, {
                subject: mailOptions.subject,
            });
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`Email sent successfully to ${recipient}`, {
                messageId: info.messageId,
                subject: mailOptions.subject,
            });
            return {
                success: true,
                messageId: info.messageId,
            };
        }
        catch (error) {
            console.error(`Failed to send email directly to ${recipient}`, {
                error,
                subject: mailOptions.subject,
            });
            throw error;
        }
    }
    /**
     * Queue an email for sending
     * @param {MailOptions} mailOptions - Email options
     * @param {EmailQueueOptions} options - Queue options
     * @returns {Promise<object>} Queue result
     */
    async queueEmail(mailOptions, options = {}) {
        if (!this.queue) {
            // Fallback to direct sending if queue is not available
            return this.sendEmailDirectly(mailOptions);
        }
        const jobOptions = {
            priority: options.priority === "high" ? 1 : options.priority === "low" ? 10 : 5,
            attempts: options.attempts || EMAIL_RETRY_ATTEMPTS,
            delay: options.delay || 0,
        };
        const recipient = typeof mailOptions.to === "string"
            ? mailOptions.to
            : Array.isArray(mailOptions.to)
                ? mailOptions.to.join(", ")
                : "unknown";
        try {
            console.log(`Queuing email to ${recipient}`, {
                subject: mailOptions.subject,
                priority: jobOptions.priority,
            });
            const job = await this.queue.add({ mailOptions }, jobOptions);
            return {
                success: true,
                queued: true,
                jobId: job.id,
            };
        }
        catch (error) {
            console.error(`Failed to queue email to ${recipient}`, {
                error,
                subject: mailOptions.subject,
            });
            throw new Error(`Failed to queue email: ${error.message}`);
        }
    }
    /**
     * Get queue statistics
     * @returns {Promise<object>} Queue stats
     */
    async getQueueStats() {
        if (!this.queue) {
            return {
                enabled: false,
                message: "Email queue is not enabled"
            };
        }
        try {
            const jobCounts = await this.queue.getJobCounts();
            const workers = await this.queue.getWorkers();
            const isPaused = await this.queue.isPaused();
            return {
                enabled: true,
                isPaused,
                workers: workers.length,
                jobs: jobCounts
            };
        }
        catch (error) {
            console.error("Failed to get queue statistics", { error });
            return {
                enabled: true,
                error: error.message
            };
        }
    }
}
exports.default = new EmailService();
