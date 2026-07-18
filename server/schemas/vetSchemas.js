import Joi from 'joi';

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const baseFields = {
    name: Joi.string().trim().min(2).max(120)
        .messages({
            'string.empty': 'El nombre es requerido',
            'string.min': 'El nombre debe tener al menos 2 caracteres',
        }),
    slug: Joi.string().trim().lowercase().min(2).max(80).pattern(slugRegex)
        .messages({
            'string.pattern.base': 'El slug solo puede tener letras minúsculas, números y guiones',
        }),
    email: Joi.string().trim().email().max(150).allow('', null),
    phone: Joi.string().trim().max(30).allow('', null),
    whatsapp: Joi.string().trim().max(30).allow('', null),
    website: Joi.string().trim().uri().max(200).allow('', null),
    instagram: Joi.string().trim().max(80).allow('', null),
    address: Joi.string().trim().max(200).allow('', null),
    city: Joi.string().trim().max(80).allow('', null),
    country: Joi.string().trim().length(2).uppercase().default('UY'),
    lat: Joi.number().min(-90).max(90).allow(null),
    lng: Joi.number().min(-180).max(180).allow(null),
    logo_url: Joi.string().trim().uri().max(500).allow('', null),
    cover_url: Joi.string().trim().uri().max(500).allow('', null),
    bio: Joi.string().trim().max(2000).allow('', null),
    hours: Joi.object().unknown(true).allow(null),
    services: Joi.array().items(Joi.string().trim().min(1).max(80)).max(30).default([]),
};

export const createVetSchema = Joi.object({
    ...baseFields,
    name: baseFields.name.required(),
    slug: baseFields.slug.optional(),
});

export const updateVetSchema = Joi.object({
    ...baseFields,
    name: baseFields.name.optional(),
}).min(1);

export const nearbyVetsSchema = Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    radius_km: Joi.number().min(0.1).max(500).default(15),
    limit: Joi.number().integer().min(1).max(50).default(20),
});

export const listVetsSchema = Joi.object({
    city: Joi.string().trim().max(80).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
});
