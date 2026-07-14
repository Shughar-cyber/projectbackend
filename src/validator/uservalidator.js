import Joi from "joi";

export const validateSignup = Joi.object({
    username: Joi.string().required().min(3).max(100),
    phone: Joi.string().required().pattern(/^\+?[0-9\s-]{7,20}$/),
    email: Joi.string().email().required(),
    password: Joi.string().required().min(8).max(16)
});

export const validateLogin = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required().min(8).max(16)
});
