import Joi from 'joi';

export const updateLocationSchema = Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
});

export const updateNotifyNearbySchema = Joi.object({
    enabled: Joi.boolean().required(),
});
