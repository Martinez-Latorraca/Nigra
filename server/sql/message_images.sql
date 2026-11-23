-- Fotos en el chat: un mensaje puede llevar una imagen (subida a Cloudinary,
-- carpeta mimo/chat). content queda '' cuando el mensaje es solo la foto.
-- Correr ANTES de deployar el server que lee esta columna.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;
