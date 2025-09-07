// uploadFile.ts
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../util/cloudinary"; // adjust to your path
import { v4 as uuidv4 } from 'uuid';

export const uploadFile = async (file: File): Promise<string> => {
  const fileRef = ref(storage, `garage_uploads/${Date.now()}-${uuidv4()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
};
