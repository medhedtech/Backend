// @ts-nocheck
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  baseLessonSchema,
  videoLessonSchema,
  quizLessonSchema,
  assessmentLessonSchema,
} from './lesson-schemas';
const { Schema } = mongoose;

/* ------------------------------ */
/* Helper Functions & Constants   */
/* ------------------------------ */

const isValidPdfUrl = (v: string) => {
  return (
    /\.pdf($|\?|#)/.test(v) ||
    /\/pdf\//.test(v) ||
    /documents.*\.amazonaws\.com/.test(v) ||
    /drive\.google\.com/.test(v) ||
    /dropbox\.com/.test(v)
  );
};

const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
};

/**
 * Recursively assign IDs to nested curriculum data.
 */
const assignCurriculumIds = (curriculum: any[]) => {
  curriculum.forEach((week, weekIndex) => {
    week.id = `week_${weekIndex + 1}`;

    if (week.lessons) {
      week.lessons.forEach((lesson: any, lessonIndex: number) => {
        lesson.id = `lesson_w${weekIndex + 1}_${lessonIndex + 1}`;
        if (lesson.resources) {
          lesson.resources.forEach((resource: any, resourceIndex: number) => {
            resource.id = `resource_${lesson.id}_${resourceIndex + 1}`;
          });
        }
      });
    }

    if (week.liveClasses) {
      week.liveClasses.forEach((liveClass: any, classIndex: number) => {
        if (!liveClass.id) {
          liveClass.id = `live_w${weekIndex + 1}_${classIndex + 1}`;
        }
      });
    }

    if (week.sections) {
      week.sections.forEach((section: any, sectionIndex: number) => {
        section.id = `section_${weekIndex + 1}_${sectionIndex + 1}`;
        if (section.lessons) {
          section.lessons.forEach((lesson: any, lessonIndex: number) => {
            lesson.id = `lesson_${weekIndex + 1}_${sectionIndex + 1}_${lessonIndex + 1}`;
            if (lesson.resources) {
              lesson.resources.forEach((resource: any, resourceIndex: number) => {
                resource.id = `resource_${lesson.id}_${resourceIndex + 1}`;
              });
            }
          });
        }
      });
    }
  });
};

/* ------------------------------ */
/* Batch Schema                   */
/* ------------------------------ */
const batchSchema = new Schema(
  {
    batch_name: { type: String, required: true, trim: true },
    batch_code: { type: String, unique: true, required: true, trim: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    status: {
      type: String,
      enum: ['Active','Upcoming','Completed','Cancelled'],
      default: 'Upcoming',
    },
    start_date: { type: Date, required: true },
    end_date: {
      type: Date,
      required: true,
      validate: {
        validator(v: Date) { return v > this.start_date; },
        message: 'End date must be after start date',
      },
    },
    capacity: { type: Number, required: true, min: 1 },
    enrolled_students: { type: Number, default: 0, min: 0 },
    assigned_instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', required: true },
    schedule: [
      {
        day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], required: true },
        start_time: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
        end_time: {
          type: String,
          required: true,
          match: /^([01]\d|2[0-3]):([0-5]\d)$/,
          validate: {
            validator(v: string) {
              const [h,m] = this.start_time.split(':').map(Number);
              const [h2,m2] = v.split(':').map(Number);
              return h2*60 + m2 > h*60 + m;
            },
            message: 'End time must be after start time',
          },
        },
      }
    ],
    batch_notes: { type: String, trim: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

/* ------------------------------ */
/* Schemas                        */
/* ------------------------------ */
const pdfResourceSchema = new Schema({
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true, validate: { validator: isValidPdfUrl, message: props => `${props.value} is not a valid PDF URL.` } },
  description: { type: String, default: '', trim: true },
  size_mb: { type: Number, min: 0, max: 50, default: null },
  pages: { type: Number, min: 1, default: null },
  upload_date: { type: Date, default: Date.now },
});

const faqSchema = new Schema({ question: { type: String, required: true, trim: true }, answer: { type: String, required: true, trim: true } });

const lessonResourceSchema = new Schema({ id: { type: String, required: true }, title: { type: String, required: true, trim: true }, url: { type: String, required: true, trim: true }, type: { type: String, enum: ['pdf','document','link','other'], required: true }, description: { type: String, default: '', trim: true } });

const curriculumSectionSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  order: { type: Number, required: true, min: 0 },
  lessons: [baseLessonSchema],
  resources: [
    { title: { type: String, required: true, trim: true }, description: { type: String, trim: true }, fileUrl: { type: String, required: true, trim: true }, type: { type: String, enum: ['pdf','document','video','audio','link'], required: true } }
  ],
}, { timestamps: true });

const curriculumWeekSchema = new Schema({
  id: { type: String, required: true, unique: true },
  weekTitle: { type: String, required: true, trim: true },
  weekDescription: { type: String, default: '', trim: true },
  topics: [{ type: String, trim: true }],
  lessons: { type: [baseLessonSchema], default: [] },
  liveClasses: { type: [
    { title: { type: String, required: true, trim: true }, description: { type: String, default: '', trim: true }, scheduledDate: { type: Date, required: true }, duration: { type: Number, min: 15, required: true }, meetingLink: { type: String, trim: true }, instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor' }, recordingUrl: { type: String, trim: true }, isRecorded: { type: Boolean, default: false }, materials: [{ title: { type: String, required: true, trim: true }, url: { type: String, required: true, trim: true }, type: { type: String, enum: ['pdf','document','presentation','code','other'], default: 'other' } }] }
  ], default: [] },
  sections: { type: [curriculumSectionSchema], default: [] },
}, { timestamps: true });

const toolTechnologySchema = new Schema({ name: { type: String, required: true, trim: true }, category: { type: String, enum: ['programming_language','framework','library','tool','platform','other'], default: 'other' }, description: { type: String, default: '', trim: true }, logo_url: { type: String, default: '', trim: true } });

const bonusModuleSchema = new Schema({ title: { type: String, trim: true }, description: { type: String, default: '', trim: true }, resources: { type: [ { title: { type: String, required: true, trim: true }, type: { type: String, enum: ['video','pdf','link','other'], required: true }, url: { type: String, required: true, validate: { validator(v: string) { if (this.type === 'pdf') return isValidPdfUrl(v); return true; }, message: props => `${props.value} is not a valid PDF URL.` } }, description: { type: String, default: '', trim: true }, size_mb: { type: Number, min: 0, max: 50, default: null }, pages: { type: Number, min: 1, default: null }, upload_date: { type: Date, default: Date.now } } ], default: [] } });

const priceSchema = new Schema({ currency: { type: String, required: true, trim: true, enum: ['USD','EUR','INR','GBP','AUD','CAD'], uppercase: true }, individual: { type: Number, min: 0, default: 0 }, batch: { type: Number, min: 0, default: 0 }, min_batch_size: { type: Number, min: 2, default: 2 }, max_batch_size: { type: Number, min: 2, default: 10, validate: { validator(v: number) { return v >= this.min_batch_size; }, message: 'Maximum batch size must be >= minimum' } }, early_bird_discount: { type: Number, min: 0, max: 100, default: 0 }, group_discount: { type: Number, min: 0, max: 100, default: 0 }, is_active: { type: Boolean, default: true } });

const courseSchema = new Schema({
  course_category: { type: String, required: true, trim: true, index: true },
  course_subcategory: { type: String, trim: true },
  course_title: { type: String, required: true, trim: true, index: true },
  course_subtitle: { type: String, trim: true },
  course_tag: { type: String, index: true },
  course_description: { type: { program_overview: { type: String, required: true, trim: true }, benefits: { type: String, required: true, trim: true }, learning_objectives: { type: [String], default: [] }, course_requirements: { type: [String], default: [] }, target_audience: { type: [String], default: [] } }, required: true },
  course_level: { type: String },
  language: { type: String, default: 'English' },
  subtitle_languages: { type: [String], default: [] },
  no_of_Sessions: { type: Number, min: 1, required: true },
  course_duration: { type: String, required: true, trim: true },
  session_duration: { type: String, trim: true },
  prices: { type: [priceSchema], default: [], validate: { validator(prices) { if (!prices.length) return true; const cur = prices.map(p => p.currency); return new Set(cur).size===cur.length; }, message: 'Duplicate currencies not allowed' } },
  brochures: { type: [String], default: [], validate: { validator(urls: string[]) { return urls.every(u => u && (/\.pdf($|\?|#)/.test(u) || /\/pdf\//.test(u))); }, message: 'Brochures must be valid PDFs' } },
  status: { type: String, enum: ['Published','Upcoming','Draft'], default:'Draft', index:true },
  category_type: { type: String, enum:['Free','Paid','Live','Hybrid','Pre-Recorded'], default:'Paid', required:true, index:true },
  isFree: { type:Boolean, default:false, index:true },
  assigned_instructor: { type: mongoose.Schema.Types.ObjectId, ref:'AssignedInstructor', default:null },
  specifications: { type: mongoose.Schema.Types.ObjectId, ref:'Category', default:null },
  unique_key: { type:String, unique:true, immutable:true },
  slug: { type:String, lowercase:true, trim:true },
  course_image: { type:String, required:true, trim:true },
  course_grade: { type:String, trim:true },
  resource_pdfs: { type:[pdfResourceSchema], default:[] },
  curriculum: { type:[curriculumWeekSchema], default:[] },
  faqs: { type:[faqSchema], default:[] },
  tools_technologies: { type:[toolTechnologySchema], default:[] },
  bonus_modules: { type:[bonusModuleSchema], default:[] },
  final_evaluation: { type: { final_faqs:[faqSchema], final_quizzes:[{ type:mongoose.Schema.Types.ObjectId, ref:'Quiz'}], final_assessments:[{ type:mongoose.Schema.Types.ObjectId, ref:'Assessment'}], certification:{ type:mongoose.Schema.Types.ObjectId, ref:'Certificate', default:null } }, default:{} },
  efforts_per_Week: { type:String, trim:true },
  class_type:{ type:String, trim:true, enum:['Live Courses','Blended Courses','Self-Paced','Virtual Learning','Online Classes','Hybrid','Pre-Recorded'], required:true, index:true },
  is_Certification:{ type:String, enum:['Yes','No'], required:true },
  is_Assignments:{ type:String, enum:['Yes','No'], required:true },
  is_Projects:{ type:String, enum:['Yes','No'], required:true },
  is_Quizes:{ type:String, enum:['Yes','No'], required:true },
  related_courses:{ type:[String], default:[] },
  min_hours_per_week:{ type:Number, min:0 },
  max_hours_per_week:{ type:Number, min:0, validate:{ validator(v) { return v>=this.min_hours_per_week; }, message:'Max hours must be >= min' } },
  meta:{ views:{ type:Number, default:0, min:0 }, ratings:{ average:{ type:Number, default:0, min:0, max:5 }, count:{ type:Number, default:0, min:0 } }, enrollments:{ type:Number, default:0, min:0 }, lastUpdated:{ type:Date, default:Date.now } },
  show_in_home:{ type:Boolean, default:false, index:true }
}, { timestamps:true, toJSON:{virtuals:true}, toObject:{virtuals:true} });

courseSchema.index({ course_title:'text', course_category:'text', 'course_description.program_overview':'text', 'course_description.benefits':'text', course_tag:'text' }, { weights:{ course_title:10, course_category:5, 'course_description.program_overview':3, 'course_description.benefits':2, course_tag:1 }, name:'CourseSearchIndex' });
courseSchema.index({ category_type:1, status:1, course_fee:1 });
courseSchema.index({ course_category:1, isFree:1 });
courseSchema.index({ createdAt:-1 });
courseSchema.index({ slug:1 },{ unique:true, sparse:true });

courseSchema.virtual('durationFormatted').get(function(){ return this.course_duration; });
courseSchema.virtual('priceDisplay').get(function(){ if(this.isFree) return 'Free'; if(this.prices && this.prices.length>0){ const p=this.prices[0]; return `${p.currency} ${p.individual}`;} return `${this.course_fee}`; });
courseSchema.virtual('quizzes',{ ref:'Quiz', localField:'_id', foreignField:'course' });
courseSchema.virtual('assignments',{ ref:'Assignment', localField:'_id', foreignField:'course' });
courseSchema.virtual('certificates',{ ref:'Certificate', localField:'_id', foreignField:'course' });

courseSchema.pre('save',function(next){ if(!this.unique_key) this.unique_key=uuidv4(); if(!this.slug&&this.course_title) this.slug=generateSlug(this.course_title); this.isFree=this.category_type==='Free'; if(!this.efforts_per_Week&&this.min_hours_per_week&&this.max_hours_per_week) this.efforts_per_Week=`${this.min_hours_per_week} - ${this.max_hours_per_week} hours / week`; if(this.prices&&this.prices.length>0) this.course_fee=this.prices[0].batch; if(this.isModified()) this.meta.lastUpdated=Date.now(); if(this.curriculum&&this.curriculum.length>0) assignCurriculumIds(this.curriculum); next(); });

courseSchema.methods.getStatistics = async function(){ const [totalStudents, avg, totalViews]=await Promise.all([this.model('Enrollment').countDocuments({course:this._id}), this.model('Review').aggregate([{ $match:{course:this._id, status:'approved'}},{ $group:{_id:null, avg:{ $avg:'$rating'} }}]), this.model('Lesson').aggregate([{ $match:{course:this._id}},{ $group:{_id:null, total:{ $sum:'$meta.views'} }}]) ]); const directTotal=this.curriculum.reduce((s,w)=>(s+(w.lessons?w.lessons.length:0)+(w.sections?w.sections.reduce((ws,sec)=>(ws+(sec.lessons?sec.lessons.length:0)),0):0)),0); const liveTotal=this.curriculum.reduce((s,w)=>(s+(w.liveClasses?w.liveClasses.length:0)),0); return { totalStudents, averageRating:avg[0]?.avg||0, totalViews:totalViews[0]?.total||0, totalLessons:directTotal, totalLiveClasses:liveTotal, totalQuizzes: await this.model('Quiz').countDocuments({course:this._id}), totalAssignments: await this.model('Assignment').countDocuments({course:this._id}), totalCertificates: await this.model('Certificate').countDocuments({course:this._id}) }; };
courseSchema.methods.getStudentProgress = async function(studentId){ const [enrollment,progress]=await Promise.all([ this.model('Enrollment').findOne({course:this._id, student:studentId}), this.model('Progress').findOne({course:this._id, student:studentId}) ]); if(!enrollment||!progress) return null; const lessons=await this.model('Lesson').find({course:this._id}); const compLessons=progress.lessonProgress.filter(p=>p.status==='completed'); const compQuizzes=progress.quizProgress.filter(p=>p.status==='completed'); const compAssign=progress.assignmentProgress.filter(p=>p.status==='graded'); return { enrollment, progress:{ overall:progress.overallProgress, lessons:{ total:lessons.length, completed:compLessons.length, inProgress:progress.lessonProgress.length-compLessons.length }, quizzes:{ total:await this.model('Quiz').countDocuments({course:this._id}), completed:compQuizzes.length }, assignments:{ total:await this.model('Assignment').countDocuments({course:this._id}), completed:compAssign.length }, certificate:await this.model('Certificate').findOne({course:this._id, student:studentId}) } }; };

courseSchema.statics.isValidPdfUrl = function(url){ return isValidPdfUrl(url); };
courseSchema.statics.createBatch = async function(courseId,batchData,adminId){ const course=await this.findById(courseId); if(!course) throw new Error('Course not found'); if(!batchData.batch_code){ const prefix=course.course_title.split(' ').map(w=>w[0]).join('').toUpperCase(); batchData.batch_code=`${prefix}-${Date.now().toString().slice(-6)}`;} const newBatch=new mongoose.models.Batch({ ...batchData, course:courseId, created_by:adminId }); return await newBatch.save(); };
courseSchema.statics.assignInstructorToBatch = async function(batchId,instructorId,adminId){ const BatchModel=mongoose.models.Batch; const batch=await BatchModel.findById(batchId); if(!batch) throw new Error('Batch not found'); const instr=await mongoose.models.Instructor.findById(instructorId); if(!instr) throw new Error('Instructor not found'); batch.assigned_instructor=instructorId; batch.updated_by=adminId; return await batch.save(); };
courseSchema.statics.getBatchesForCourse = async function(courseId){ return await mongoose.models.Batch.find({course:courseId}).populate('assigned_instructor'); };

const Course = mongoose.model('Course', courseSchema);
const Batch = mongoose.model('Batch', batchSchema);

export { Course, Batch };
export default Course; 