export interface VideoMetadata {
  file_path: string;
  resolution: string;
  frame_rate: string;
  duration: string;
  bit_rate: string;
  thumbnail_base64: string;
  error?: string;
}
