import {
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable,
} from "firebase/storage";
import { storage } from "./firebase";

export async function uploadOnboardingPhoto(
  uid: string,
  file: File,
  position: "face" | "profil_gauche" | "profil_droit" | "dos"
): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "jpg";
  const path = `users/${uid}/onboarding/${timestamp}_${position}.${extension}`;
  const storageRef = ref(storage, path);

  // Compress image client-side before upload
  const compressedFile = await compressImage(file, 1200, 0.8);
  await uploadBytes(storageRef, compressedFile);
  return getDownloadURL(storageRef);
}

export async function uploadProgressPhoto(
  uid: string,
  file: File,
  label: string
): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "jpg";
  const path = `users/${uid}/progress/${timestamp}_${label}.${extension}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadFormCheckVideo(
  uid: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "mp4";
  const path = `users/${uid}/form-checks/${timestamp}.${extension}`;
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
}

// Image compression utility
async function compressImage(
  file: File,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => resolve(blob || file),
          "image/jpeg",
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
