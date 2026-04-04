import Joi from 'joi';

const validTypes = ['dog', 'cat'];
const validColors = ['black', 'white', 'brown', 'orange', 'gray', 'grey', 'mixed', 'golden', 'yellow', 'spotted', 'striped', 'tan'];
const validStatuses = ['lost', 'found'];

export const reportPetSchema = Joi.object({
    description: Joi.string().trim().min(3).max(500).required()
        .messages({
            'string.empty': 'La descripción es requerida',
            'string.min': 'La descripción debe tener al menos 3 caracteres',
            'string.max': 'La descripción no puede superar los 500 caracteres',
        }),
    status: Joi.string().valid(...validStatuses).required()
        .messages({
            'any.only': 'El estado debe ser "lost" o "found"',
            'string.empty': 'El estado es requerido',
        }),
    type: Joi.string().valid(...validTypes).required()
        .messages({
            'any.only': 'El tipo debe ser "dog" o "cat"',
            'string.empty': 'El tipo es requerido',
        }),
    color: Joi.string().valid(...validColors).required()
        .messages({
            'any.only': 'Color no válido',
            'string.empty': 'El color es requerido',
        }),
    contact_info: Joi.string().trim().max(100).allow('', null)
        .messages({ 'string.max': 'La info de contacto no puede superar los 100 caracteres' }),
    name: Joi.string().trim().max(50).allow('', null)
        .messages({ 'string.max': 'El nombre no puede superar los 50 caracteres' }),
    lat: Joi.number().min(-90).max(90).allow(null, ''),
    lng: Joi.number().min(-180).max(180).allow(null, ''),
});

export const searchPetSchema = Joi.object({
    type: Joi.string().valid(...validTypes).required()
        .messages({ 'any.only': 'El tipo debe ser "dog" o "cat"', 'string.empty': 'El tipo es requerido' }),
    color: Joi.string().valid(...validColors).required()
        .messages({ 'any.only': 'Color no válido', 'string.empty': 'El color es requerido' }),
    status: Joi.string().valid(...validStatuses).required()
        .messages({ 'any.only': 'El estado debe ser "lost" o "found"', 'string.empty': 'El estado es requerido' }),
    lat: Joi.number().min(-90).max(90).allow(null, ''),
    lng: Joi.number().min(-180).max(180).allow(null, ''),
    searchRatio: Joi.number().min(1).max(500).allow(null, ''),
});
