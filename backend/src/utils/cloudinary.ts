import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import multer, { type FileFilterCallback } from 'multer';
import { type Request } from 'express';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Format file tidak didukung. Gunakan gambar JPG, JPEG, PNG, atau WEBP.',
      ),
    );
  }
};

export const uploadImageMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Maksimal 5MB
  },
  fileFilter: imageFileFilter,
});

export function uploadToCloudinary(
  fileBuffer: Buffer,
  folderName: 'avatars' | 'chats',
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `sahabat-digital/${folderName}`,
        resource_type: 'image',
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          return reject(
            error ?? new Error('Gagal mengunggah gambar ke Cloudinary.'),
          );
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    uploadStream.end(fileBuffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

export async function deleteMultipleFromCloudinary(
  publicIds: string[],
): Promise<void> {
  const validIds = publicIds.filter((id) => Boolean(id && id.trim()));
  if (validIds.length === 0) return;

  await Promise.all(
    validIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId, { resource_type: 'image' }),
    ),
  );
}