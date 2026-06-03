import { describe, expect, test } from "bun:test";

import {
  convertDngToJpeg,
  imagePreparationErrorMessage,
  isDngImage,
  isHeicImage,
  normalizeImageForCrop
} from "@/lib/image-conversion";

describe("image conversion helpers", () => {
  test("treats HEIC extension as HEIC even when the browser omits the MIME type", async () => {
    const file = new File(["not enough bytes to decode"], "photo.HEIC", {
      type: ""
    });

    await expect(isHeicImage(file)).resolves.toBe(true);
  });

  test("treats HEIC sequence MIME types as HEIC", async () => {
    const file = new File(["not enough bytes to decode"], "photo", {
      type: "image/heic-sequence"
    });

    await expect(isHeicImage(file)).resolves.toBe(true);
  });

  test("detects HEIC from compatible brands when major brand is generic", async () => {
    const ftypBox = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20,
      0x00, 0x00, 0x00, 0x00, 0x68, 0x65, 0x69, 0x63, 0x6d, 0x69, 0x66, 0x31
    ]);
    const file = new File([ftypBox], "photo", {
      type: ""
    });

    await expect(isHeicImage(file)).resolves.toBe(true);
  });

  test("leaves PNG files unchanged", async () => {
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52
    ]);
    const file = new File([pngBytes], "photo.png", {
      type: "image/png"
    });

    await expect(normalizeImageForCrop(file)).resolves.toBe(file);
  });

  test("detects DNG files by extension", () => {
    const file = new File(["raw image data"], "photo.DNG", {
      type: ""
    });

    expect(isDngImage(file)).toBe(true);
  });

  test("extracts an embedded JPG preview from a DNG file", async () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, 0xff, 0xd9]);
    const file = new File([new Uint8Array([0x49, 0x49, 0x2a, 0x00]), jpegBytes], "photo.dng", {
      type: "image/x-adobe-dng"
    });
    const previousUrl = globalThis.URL;
    const previousWindow = globalThis.window;

    globalThis.URL = {
      ...previousUrl,
      createObjectURL: () => "blob:test",
      revokeObjectURL: () => undefined
    };
    globalThis.window = {
      Image: class {
        src = "";

        decode() {
          return Promise.resolve();
        }
      }
    } as unknown as Window & typeof globalThis;

    try {
      const convertedFile = await convertDngToJpeg(file);

      expect(convertedFile.name).toBe("photo-converted.jpg");
      expect(convertedFile.type).toBe("image/jpeg");
      expect(new Uint8Array(await convertedFile.arrayBuffer())).toEqual(jpegBytes);
    } finally {
      globalThis.URL = previousUrl;
      globalThis.window = previousWindow;
    }
  });

  test("shows a specific message when a DNG has no embedded JPG preview", async () => {
    const file = new File([new Uint8Array([0x49, 0x49, 0x2a, 0x00])], "photo.dng", {
      type: "image/x-adobe-dng"
    });

    await expect(convertDngToJpeg(file)).rejects.toThrow("does not include");
  });

  test("uses a generic conversion message for unexpected conversion errors", () => {
    expect(imagePreparationErrorMessage(new Error("network failed"))).toBe(
      "Could not convert this image. Please choose another photo."
    );
  });
});
