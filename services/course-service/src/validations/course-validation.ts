import Joi from 'joi';

export const validateCourseData = (data: any) => {
  const schema = Joi.object({
    course_title: Joi.string().required(),
    course_description: Joi.object({
      program_overview: Joi.string().required(),
      benefits: Joi.string().required(),
      learning_objectives: Joi.array().items(Joi.string()).default([]),
      course_requirements: Joi.array().items(Joi.string()).default([]),
      target_audience: Joi.array().items(Joi.string()).default([]),
    }).required(),
    course_category: Joi.string().required(),
    course_tag: Joi.array().items(Joi.string()),
    course_image: Joi.string().allow('', null),
    course_fee: Joi.number().min(0),
    isFree: Joi.boolean(),
    status: Joi.string().valid('draft', 'published', 'archived'),
    category_type: Joi.string().allow('', null),
    curriculum: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        description: Joi.string().allow('', null),
        sections: Joi.array().items(
          Joi.object({
            title: Joi.string().required(),
            lessons: Joi.array().items(Joi.object()),
          }),
        ),
        lessons: Joi.array().items(Joi.object()),
        liveClasses: Joi.array().items(Joi.object()),
      }),
    ),
    prices: Joi.object().allow(null),
  });

  return schema.validate(data);
};

export const validateVideoLessonData = (data: any) => {
  const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().allow('', null),
    video_url: Joi.string().required(),
    duration: Joi.number().min(0),
    is_free: Joi.boolean(),
    resources: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        url: Joi.string().required(),
        type: Joi.string().valid(
          'pdf',
          'document',
          'spreadsheet',
          'link',
          'image',
          'other',
        ),
      }),
    ),
  });

  return schema.validate(data);
};

export const validateQuizLessonData = (data: any) => {
  const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().allow('', null),
    questions: Joi.array()
      .items(
        Joi.object({
          question: Joi.string().required(),
          options: Joi.array().items(Joi.string()).min(2).required(),
          correct_answer: Joi.number().required(),
          explanation: Joi.string().allow('', null),
        }),
      )
      .min(1)
      .required(),
    passing_score: Joi.number().min(0).max(100).required(),
    time_limit: Joi.number().min(0),
  });

  return schema.validate(data);
};

export const validateBatchData = (data: any) => {
  const schema = Joi.object({
    batch_name: Joi.string().required(),
    start_date: Joi.date().required(),
    end_date: Joi.date().greater(Joi.ref('start_date')).required(),
    // add other rules
  });
  return schema.validate(data);
}; 