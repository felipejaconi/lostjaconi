import imageCompression from "browser-image-compression";

export const optimizeImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.1, // 100KB max size for faster loading
    maxWidthOrHeight: 600, // 600px is enough for thumbnails and standard views
    useWebWorker: true,
    fileType: "image/webp" as any, // Convert to webp if possible
  };

  try {
    const compressedFile = await imageCompression(file, options);
    // browser-image-compression might return a Blob, we convert it to File
    return new File(
      [compressedFile],
      file.name.replace(/\.[^/.]+$/, "") + ".webp",
      {
        type: "image/webp",
      },
    );
  } catch (error) {
    console.error("Error compressing image:", error);
    return file; // Return original file if compression fails
  }
};
