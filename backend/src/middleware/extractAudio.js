import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({
  apiKey: "a0c16cc2c6a14184a5e94b89939d31d0",
});

export const extractAudio = async (req, res, next) => {
  try {
    const { audio } = req.body; // Base64 encoded audio
    if (!audio) {
      console.error("No audio file provided");
      return res.status(400).json({ message: "No audio file provided" });
    }

    // Convert Base64 to Buffer
    const audioBuffer = Buffer.from(audio, "base64");

    // Store it in req.audioFile for further processing
    const audioFile = {
      buffer: audioBuffer,
      mimetype: "audio/webm", // Set correct MIME type
    };

    console.log("Audio file converted to buffer successfully");

    // Transcribe the audio
    try {
      console.log("Starting transcription process");
      const transcript = await client.transcripts.transcribe({
        audio: audioFile.buffer,
      });

      console.log("Inside transcribeAudio function");

      const completedTranscript = await client.transcripts.waitUntilReady(
        transcript.id
      );

      console.log("Transcription completed:", completedTranscript.text);

      const finalTranscript = completedTranscript.text;

      // Attach the transcription to the request object for further processing
      req.transcription = finalTranscript;
      next();
    } catch (error) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } catch (error) {
    console.error("Error extracting audio:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
