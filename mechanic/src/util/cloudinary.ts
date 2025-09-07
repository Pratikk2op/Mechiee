import toast from "react-hot-toast";

export const handleFileUpload = async (file: File): Promise<string | undefined> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'ml_default'); // configured in Cloudinary
  
        const res = await fetch('https://api.cloudinary.com/v1_1/dfurgmper/upload', {
            method: 'POST',
            body: formData
        });
  
        const data = await res.json();
        return data.secure_url; // URL of uploaded image
        
    } catch {
        toast.error("Something went wrong");
        return undefined;
    }
};
  