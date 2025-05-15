import Joi from 'joi';

// Phone number schema
export const phoneNumberSchema = Joi.object({
  country: Joi.string().required().messages({
    'string.empty': 'Country code is required',
  }),
  number: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required().messages({
    'string.empty': 'Phone number is required',
    'string.pattern.base': 'Phone number must be in E.164 format (e.g. +12345678901)',
  }),
});

// User registration validation
const userValidation = Joi.object({
  full_name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Full name is required',
    'string.min': 'Full name must be at least 2 characters',
    'string.max': 'Full name cannot exceed 100 characters',
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please enter a valid email address',
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
  }),
  agree_terms: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must accept the terms to proceed',
  }),
  phone_numbers: Joi.array().items(phoneNumberSchema).min(1).required().messages({
    'array.min': 'At least one phone number is required',
  }),
});

export default userValidation; 