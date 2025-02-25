import { create } from "zustand";
import axios from "axios";

const BASE_URL =
  import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

const useIntrestStore = create((set) => ({
  audioURL: null,
  setAudioURL: (url) => set({ audioURL: url }),

  sendAudioToBackend: async (audioBlob) => {
    try {
      // Convert Blob to Base64
      const convertBlobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => resolve(reader.result.split(",")[1]); // Extract base64 part
          reader.onerror = reject;
        });
      };

      const base64Audio = await convertBlobToBase64(audioBlob);

      // Send Base64 encoded audio to backend
      const response = await axios.post(
        `${BASE_URL}/api/upload/upload-audio`,
        { audio: base64Audio },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      if (response.status === 200) {
        console.log("Audio uploaded successfully", response);
        return response.status;
      } else {
        console.error("Failed to upload audio");
        return response.status;
      }
    } catch (error) {
      console.error("Error uploading audio:", error);
      return 500;
    }
  },
}));

export default useIntrestStore;
