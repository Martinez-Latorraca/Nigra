import Joi from 'joi';

export const sendMessageSchema = Joi.object({
    receiver_id: Joi.number().integer().positive().required()
        .messages({ 'number.base': 'El destinatario no es válido' }),
    pet_id: Joi.number().integer().positive().required()
        .messages({ 'number.base': 'El ID de mascota no es válido' }),
    content: Joi.string().trim().min(1).max(1000).required()
        .messages({
            'string.empty': 'El mensaje no puede estar vacío',
            'string.max': 'El mensaje no puede superar los 1000 caracteres',
        }),
});

export const readMessagesSchema = Joi.object({
    pet_id: Joi.number().integer().positive().required()
        .messages({ 'number.base': 'El ID de mascota no es válido' }),
    other_user_id: Joi.number().integer().positive().required()
        .messages({ 'number.base': 'El ID de usuario no es válido' }),
});
