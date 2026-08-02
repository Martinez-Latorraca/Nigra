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
    // Sin address ni lat/lng: la ubicación exacta de un refugio no se pide ni
    // se guarda. Suele ser la casa de alguien, con animales adentro, y
    // publicarla los expone (abandonos en la puerta, robos, hostigamiento).
    // Solo `city`, que no identifica un domicilio. Las veterinarias sí llevan
    // dirección: son comercios que quieren que los encuentren.
    city: Joi.string().trim().max(80).allow('', null),
    country: Joi.string().trim().length(2).uppercase().default('UY'),
    logo_url: Joi.string().trim().uri().max(500).allow('', null),
    cover_url: Joi.string().trim().uri().max(500).allow('', null),
    bio: Joi.string().trim().max(2000).allow('', null),
    hours: Joi.object().unknown(true).allow(null),
};

export const createShelterSchema = Joi.object({
    ...baseFields,
    name: baseFields.name.required(),
    slug: baseFields.slug.optional(),
});

export const updateShelterSchema = Joi.object({
    ...baseFields,
    name: baseFields.name.optional(),
}).min(1);

// Solo ciudad. El filtro por lat/lng+radius_km que había acá no lo usaba
// ningún cliente (web y mobile mandan page/limit/city) y un filtro por radio
// permite triangular el domicilio repitiendo consultas con distintos centros.
export const listSheltersSchema = Joi.object({
    city: Joi.string().trim().max(80).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
});

// ---- adoption pets ----
const speciesValues = ['dog', 'cat', 'other'];
const sexValues = ['male', 'female', 'unknown'];
const ageValues = ['puppy', 'young', 'adult', 'senior', 'unknown'];
const sizeValues = ['small', 'medium', 'large'];

const adoptionBase = {
    name: Joi.string().trim().max(60).allow('', null),
    species: Joi.string().valid(...speciesValues),
    sex: Joi.string().valid(...sexValues).allow(null),
    age_group: Joi.string().valid(...ageValues).allow(null),
    size: Joi.string().valid(...sizeValues).allow(null),
    color: Joi.string().trim().max(30).allow('', null),
    description: Joi.string().trim().max(2000).allow('', null),
    vaccinated: Joi.boolean(),
    neutered: Joi.boolean(),
    // Galería. 1-6 URLs. La primera es la cover.
    photos: Joi.array().items(Joi.string().uri()).min(1).max(6),
};

export const createAdoptionPetSchema = Joi.object({
    ...adoptionBase,
    species: adoptionBase.species.required(),
    photos: adoptionBase.photos.required(),
});

export const updateAdoptionPetSchema = Joi.object(adoptionBase).min(1);

export const listAdoptionPetsSchema = Joi.object({
    species: Joi.string().valid(...speciesValues).optional(),
    sex: Joi.string().valid(...sexValues).optional(),
    age_group: Joi.string().valid(...ageValues).optional(),
    size: Joi.string().valid(...sizeValues).optional(),
    city: Joi.string().trim().max(80).optional(),
    shelter_id: Joi.number().integer().positive().optional(),
    include_adopted: Joi.boolean().default(false),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
});
