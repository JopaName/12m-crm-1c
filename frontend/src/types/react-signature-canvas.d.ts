declare module 'react-signature-canvas' {
  import { Component } from 'react';
  interface SignatureCanvasProps {
    penColor?: string;
    canvasProps?: object;
    clearOnResize?: boolean;
    onEnd?: () => void;
  }
  export default class SignatureCanvas extends Component<SignatureCanvasProps> {
    toDataURL(type?: string, encoderOptions?: number): string;
    isEmpty(): boolean;
    clear(): void;
    fromDataURL(dataUrl: string, options?: object): void;
  }
}
