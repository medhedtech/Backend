import mongoose from 'mongoose';
const { Schema } = mongoose;

// Define constants for roles and permissions for better maintainability
const ROLES = {
  ADMIN: 'admin',
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
  CORPORATE: 'corporate',
  CORPORATE_STUDENT: 'corporate-student',
  PARENT: 'parent',
};

const PERMISSIONS = {
  COURSE_MANAGEMENT: 'course_management',
  STUDENT_MANAGEMENT: 'student_management',
  INSTRUCTOR_MANAGEMENT: 'instructor_management',
  CORPORATE_MANAGEMENT: 'corporate_management',
  GENERATE_CERTIFICATE: 'generate_certificate',
  GET_IN_TOUCH: 'get_in_touch',
  ENQUIRY_FORM: 'enquiry_form',
  POST_JOB: 'post_job',
  FEEDBACK_COMPLAINTS: 'feedback_and_complaints',
  PLACEMENT_REQUESTS: 'placement_requests',
  BLOGS: 'blogs',
  ADMIN_DASHBOARD: 'admin_dashboard',
  STUDENT_DASHBOARD: 'student_dashboard',
  INSTRUCTOR_DASHBOARD: 'instructor_dashboard',
  CORPORATE_DASHBOARD: 'corporate_dashboard',
  CORPORATE_STUDENT_DASHBOARD: 'corporate_student_dashboard',
  View_Course: 'view_courses',
  View_Student: 'view_student',
  View_Instructor: 'view_instructor',
  View_Corporate: 'view_corporate',
  View_Corporate_Student: 'view_corporate_student',
  View_Admin: 'view_admin',
  View_Super_Admin: 'view_super_admin',
};

const ADMIN_ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  CORPORATE_ADMIN: 'corporate-admin',
};

const AGE_GROUPS = [
  'Under 18',
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
];

const GENDERS = ['Male', 'Female', 'Others'];

const COMPANY_TYPES = ['Institute', 'University'];

// Define phone number schema
const phoneNumberSchema = new Schema(
  {
    country: {
      type: String,
      required: [true, 'Country code is required'],
    },
    number: {
      type: String,
      required: [true, 'Phone number is required'],
      validate: {
        validator: function (v: string) {
          return /^\+?\d{10,15}$/.test(v);
        },
        message: (props: any) => `${props.value} is not a valid phone number!`,
      },
    },
  },
  { _id: false },
);

// Define user meta schema
const userMetaSchema = new Schema(
  {
    course_name: { type: String },
    age_group: { type: String, enum: AGE_GROUPS },
    category: { type: String },
    gender: { type: String, enum: GENDERS, default: 'Male' },
    upload_resume: { type: [String], default: [] },
  },
  { _id: false },
);

// Define the main user schema with improved validation
const userSchema = new Schema(
  {
    full_name: { type: String, trim: true, required: [true, 'Full name is required'] },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: [true, 'Email is required'],
      unique: true,
      validate: {
        validator: function (v: string) {
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: (props: any) => `${props.value} is not a valid email address!`,
      },
    },
    phone_numbers: [phoneNumberSchema],
    password: { type: String, required: [true, 'Password is required'], minlength: [6, 'Password must be at least 6 characters long'] },
    agree_terms: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    role: { type: [String], enum: Object.values(ROLES), default: [ROLES.STUDENT] },
    role_description: { type: String },
    assign_department: { type: [String] },
    permissions: { type: [String], enum: Object.values(PERMISSIONS) },
    age: { type: String },
    age_group: { type: String, enum: AGE_GROUPS },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    facebook_link: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/(?:www\.)?facebook\.com\/.+/i.test(v);
        },
        message: (props: any) => `${props.value} is not a valid Facebook URL!`,
      },
    },
    instagram_link: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/(?:www\.)?instagram\.com\/.+/i.test(v);
        },
        message: (props: any) => `${props.value} is not a valid Instagram URL!`,
      },
    },
    linkedin_link: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/(?:www\.)?linkedin\.com\/.+/i.test(v);
        },
        message: (props: any) => `${props.value} is not a valid LinkedIn URL!`,
      },
    },
    user_image: { type: String },
    meta: { type: userMetaSchema, default: () => ({ gender: 'Male', upload_resume: [] }) },
    admin_role: { type: String, enum: Object.values(ADMIN_ROLES), default: ADMIN_ROLES.ADMIN },
    company_type: { type: String, enum: COMPANY_TYPES },
    company_website: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(v);
        },
        message: (props: any) => `${props.value} is not a valid website URL!`,
      },
    },
    corporate_id: { type: String },
    last_login: { type: Date },
    login_count: { type: Number, default: 0 },
    emailVerified: { type: Boolean, default: false },
    emailVerificationOTP: { type: String },
    emailVerificationOTPExpires: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  },
);

// Instance methods
userSchema.methods.hasPermission = function (permission: string) {
  if (this.admin_role === ADMIN_ROLES.SUPER_ADMIN) return true;
  return this.permissions && this.permissions.includes(permission);
};
userSchema.methods.hasRole = function (role: string) {
  return this.role && this.role.includes(role);
};
userSchema.methods.isAdmin = function () {
  return [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN].includes(this.admin_role);
};
userSchema.methods.isSuperAdmin = function () {
  return this.admin_role === ADMIN_ROLES.SUPER_ADMIN;
};
userSchema.methods.isStudent = function () {
  return this.role.includes(ROLES.STUDENT);
};
userSchema.methods.isInstructor = function () {
  return this.role.includes(ROLES.INSTRUCTOR);
};
userSchema.methods.isCorporate = function () {
  return this.role.includes(ROLES.CORPORATE);
};
userSchema.methods.isCorporateStudent = function () {
  return this.role.includes(ROLES.CORPORATE_STUDENT);
};
userSchema.methods.isParent = function () {
  return this.role.includes(ROLES.PARENT);
};
userSchema.methods.isActive = function () {
  return this.status === 'Active';
};
userSchema.methods.getPrimaryRole = function () {
  return this.role.length > 0 ? this.role[0] : null;
};
userSchema.methods.updateLastLogin = async function () {
  this.last_login = new Date();
  this.login_count += 1;
  return await this.save();
};

// Static methods
userSchema.statics.findByRole = function (role: string) {
  return this.find({ role });
};
userSchema.statics.findActiveUsers = function () {
  return this.find({ status: 'Active' });
};
userSchema.statics.findInactiveUsers = function () {
  return this.find({ status: 'Inactive' });
};
userSchema.statics.findAdmins = function () {
  return this.find({ admin_role: { $in: [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN] } });
};
userSchema.statics.findSuperAdmins = function () {
  return this.find({ admin_role: ADMIN_ROLES.SUPER_ADMIN });
};
userSchema.statics.findStudents = function () {
  return this.find({ role: ROLES.STUDENT });
};
userSchema.statics.findInstructors = function () {
  return this.find({ role: ROLES.INSTRUCTOR });
};
userSchema.statics.findCorporates = function () {
  return this.find({ role: ROLES.CORPORATE });
};
userSchema.statics.findCorporateStudents = function () {
  return this.find({ role: ROLES.CORPORATE_STUDENT });
};
userSchema.statics.findParents = function () {
  return this.find({ role: ROLES.PARENT });
};

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ admin_role: 1 });
userSchema.index({ 'phone_numbers.number': 1 });

// Export model constants
export const USER_ROLES = ROLES;
export const USER_PERMISSIONS = PERMISSIONS;
export const USER_ADMIN_ROLES = ADMIN_ROLES;

// Create and export the model
const User = mongoose.model('User', userSchema);
export default User; 