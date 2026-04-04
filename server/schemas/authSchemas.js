import Joi from 'joi';

export const registerSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50).required()
        .messages({
            'string.empty': 'El nombre es requerido',
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede superar los 50 caracteres',
        }),
    email: Joi.string().trim().email().required()
        .messages({
            'string.empty': 'El email es requerido',
            'string.email': 'El email no es válido',
        }),
    password: Joi.string().min(6).max(128).required()
        .messages({
            'string.empty': 'La contraseña es requerida',
            'string.min': 'La contraseña debe tener al menos 6 caracteres',
        }),
});

export const loginSchema = Joi.object({
    email: Joi.string().trim().email().required()
        .messages({
            'string.empty': 'El email es requerido',
            'string.email': 'El email no es válido',
        }),
    password: Joi.string().required()
        .messages({ 'string.empty': 'La contraseña es requerida' }),
});
