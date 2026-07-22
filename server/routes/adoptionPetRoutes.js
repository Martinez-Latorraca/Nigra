import express from 'express';
import {
    createAdoptionPet,
    updateAdoptionPet,
    markAdopted,
    deleteAdoptionPet,
    uploadAdoptionPetPhoto,
    listAdoptionPets,
    getAdoptionPet,
    listMyAdoptionPets,
} from '../controllers/adoptionPetController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { requireShelter } from '../middlewares/shelterAuth.js';
import { upload } from '../middlewares/upload.js';
import validate from '../middlewares/validate.js';
import {
    createAdoptionPetSchema,
    updateAdoptionPetSchema,
    listAdoptionPetsSchema,
} from '../schemas/shelterSchemas.js';

const router = express.Router();

// Público
router.get('/', validate(listAdoptionPetsSchema, 'query'), listAdoptionPets);

// Shelter (auth + gate). "mine" antes de "/:id" para no colisionar.
router.get('/mine', authenticateToken, requireShelter, listMyAdoptionPets);
router.post('/', authenticateToken, requireShelter, validate(createAdoptionPetSchema), createAdoptionPet);
router.post('/upload-photo', authenticateToken, requireShelter, upload.single('photo'), uploadAdoptionPetPhoto);
router.patch('/:id', authenticateToken, requireShelter, validate(updateAdoptionPetSchema), updateAdoptionPet);
router.post('/:id/adopted', authenticateToken, requireShelter, markAdopted);
router.delete('/:id', authenticateToken, requireShelter, deleteAdoptionPet);

// Público (último).
router.get('/:id', getAdoptionPet);

export default router;
