import Joi from 'joi';

export const updateRoleSchema = Joi.object({
    role: Joi.string().valid('user', 'admin').required().messages({
        'any.only': 'El rol debe ser "user" o "admin"',
        'any.required': 'El rol es obligatorio',
    }),
});

// Convertir un usuario en veterinaria o refugio. Es la salida manual para las
// cuentas creadas con Google/Facebook/Apple, donde el account_type se pierde
// porque el proveedor solo devuelve nombre y mail.
export const setAccountTypeSchema = Joi.object({
    account_type: Joi.string().valid('vet', 'shelter').required().messages({
        'any.only': 'El tipo debe ser "vet" o "shelter"',
        'any.required': 'El tipo de cuenta es obligatorio',
    }),
});
