import multer from 'multer';

export type AllowedFileType = 'image' | 'video';

interface UploaderOptions {
  limit: number;
  allowedTypes: AllowedFileType[];
}

/**
 * Creates a multer instance configured for specific file types and size limits.
 * @param options - Configuration for the uploader.
 * @returns A configured multer instance.
 */
const createUploader = (options: UploaderOptions) => {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: options.limit },
    fileFilter: (req, file, cb) => {
      // Check if the file's mime type starts with any of the allowed types
      const isAllowed = options.allowedTypes.some(type => file.mimetype.startsWith(`${type}/`));

      if (isAllowed) {
        // Accept the file
        cb(null, true);
      } else {
        // Reject the file with a clear error message
        const errorMessage = `Invalid file type. Only ${options.allowedTypes.join(' or ')} files are allowed.`;
        cb(new Error(errorMessage));
      }
    },
  });
};

export { createUploader };