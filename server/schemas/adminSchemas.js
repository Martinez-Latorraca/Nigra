import Joi from 'joi';

export const updateRoleSchema = Joi.object({
    role: Joi.string().valid('user', 'admin').required().messages({
        'any.only': 'El rol debe ser "user" o "admin"',
        'any.required': 'El rol es obligatorio',
    }),
});
