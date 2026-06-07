/**
 * The displacement-map engine behind the glass. Pure, framework-agnostic — it
 * draws a signed-distance rounded-rect into a canvas where the R/G channels
 * encode the local surface normal (the refraction direction) and B encodes a
 * specular term, then returns it as a data URL for an SVG `feImage`.
 *
 * Ported from Aave's production "Glass" bundle (aave.com/design/building-glass-
 * for-the-web). Kept here as the one piece of non-obvious maths the kit needs.
 */

export type DisplacementMapOptions = {
  canvasSize: number;
  lensHalfWidth: number;
  lensHalfHeight: number;
  borderRadius: number;
  depth: number;
  sdfBoundary: boolean;
  edgeFalloff: boolean;
  specularRotation: number;
  glowStrength: number;
  glowSpread: number;
  glowExponent: number;
  edgeStrength: number;
  edgeWidth: number;
  edgeExponent: number;
  domeDepth: number;
  splayAmount: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

// Fast tanh approximation named "erf" in the bundle; eases displacement down
// across the bevel boundary.
export function erf(value: number) {
  return Math.tanh(1.7724538509 * value);
}

function integrateDomeArc(radius: number, limit: number) {
  let sum = 0;
  for (let step = 0; step <= 200; step += 1) {
    const x = (step / 200) * limit;
    const slope = x / Math.sqrt(radius * radius - x * x);
    sum += step === 0 || step === 200 ? 0.5 * slope : slope;
  }
  return sum / 200;
}

export function computeDomeConstants(
  domeDepth: number,
  lensHalfWidth: number,
  lensHalfHeight: number,
) {
  const depth = Math.max(
    0.01,
    Math.min(domeDepth, Math.min(lensHalfWidth, lensHalfHeight) - 1),
  );
  const radiusX = (lensHalfWidth * lensHalfWidth + depth * depth) / (2 * depth);
  const radiusY =
    (lensHalfHeight * lensHalfHeight + depth * depth) / (2 * depth);
  const integralX = integrateDomeArc(radiusX, lensHalfWidth);
  const integralY = integrateDomeArc(radiusY, lensHalfHeight);
  return {
    Rx: radiusX,
    Ry: radiusY,
    scaleX: integralX > 0 ? 0.5 / integralX : 1,
    scaleY: integralY > 0 ? 0.5 / integralY : 1,
  };
}

export function domeGradient(
  distanceFromCenter: number,
  radius: number,
  scale: number,
) {
  const capped = Math.min(distanceFromCenter, 0.999 * radius);
  return (capped / Math.sqrt(radius * radius - capped * capped)) * scale;
}

function roundedRectSdf(
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
  radius: number,
) {
  const qx = Math.abs(x) - halfWidth + radius;
  const qy = Math.abs(y) - halfHeight + radius;
  const outsideX = Math.max(qx, 0);
  const outsideY = Math.max(qy, 0);
  return (
    Math.sqrt(outsideX * outsideX + outsideY * outsideY) +
    Math.min(Math.max(qx, qy), 0) -
    radius
  );
}

export function generateDisplacementMap(options: DisplacementMapOptions) {
  const {
    canvasSize,
    lensHalfWidth,
    lensHalfHeight,
    borderRadius,
    depth,
    sdfBoundary,
    edgeFalloff,
    specularRotation,
    glowStrength,
    glowSpread,
    glowExponent,
    edgeStrength,
    edgeWidth,
    edgeExponent,
    domeDepth,
    splayAmount,
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext("2d");
  if (!context) return "";

  const imageData = context.createImageData(canvasSize, canvasSize);
  const radius = Math.min(borderRadius, lensHalfWidth, lensHalfHeight);
  const innerHalfWidth = Math.max(0, lensHalfWidth - depth);
  const innerHalfHeight = Math.max(0, lensHalfHeight - depth);
  const innerRadius = Math.max(
    0,
    Math.min(borderRadius, innerHalfWidth, innerHalfHeight),
  );
  const falloffScale = depth > 0 ? 1 / (depth * Math.SQRT2) : 1e6;
  const dome =
    domeDepth > 0
      ? computeDomeConstants(domeDepth, lensHalfWidth, lensHalfHeight)
      : null;
  const hasSpecular = glowStrength > 0 || edgeStrength > 0;
  const rotationRadians = (specularRotation * Math.PI) / 180;
  const specularCos = Math.cos(rotationRadians);
  const specularSin = Math.sin(rotationRadians);
  const glowStart = (1 - glowSpread) * Math.SQRT2;
  const glowRange = glowSpread * Math.SQRT2;
  const splayEdges = splayAmount < 1;
  const splayDistance = 0.5 * Math.min(lensHalfWidth, lensHalfHeight);
  const inverseSplayDistance = splayDistance > 0 ? 1 / splayDistance : 0;

  for (let pixelY = 0; pixelY < canvasSize; pixelY += 1) {
    for (let pixelX = 0; pixelX < canvasSize; pixelX += 1) {
      const index = (pixelY * canvasSize + pixelX) * 4;
      const x =
        ((pixelX + 0.5) / canvasSize) * (2 * lensHalfWidth) - lensHalfWidth;
      const y =
        ((pixelY + 0.5) / canvasSize) * (2 * lensHalfHeight) - lensHalfHeight;
      const absX = Math.abs(x);
      const absY = Math.abs(y);
      const outerDistance = roundedRectSdf(
        x,
        y,
        lensHalfWidth,
        lensHalfHeight,
        radius,
      );

      if (sdfBoundary && outerDistance >= 0) {
        imageData.data[index] = 128;
        imageData.data[index + 1] = 128;
        imageData.data[index + 2] = 128;
        imageData.data[index + 3] = 255;
        continue;
      }

      let gradientX = dome
        ? Math.sign(x) * domeGradient(absX, dome.Rx, dome.scaleX)
        : clamp(x / lensHalfWidth, -1, 1);
      let gradientY = dome
        ? Math.sign(y) * domeGradient(absY, dome.Ry, dome.scaleY)
        : clamp(y / lensHalfHeight, -1, 1);

      if (splayEdges) {
        const verticalSplay =
          Math.max(0, 1 - (lensHalfHeight - absY) * inverseSplayDistance) *
          (1 - splayAmount);
        const horizontalSplay =
          Math.max(0, 1 - (lensHalfWidth - absX) * inverseSplayDistance) *
          (1 - splayAmount);
        if (verticalSplay > 0.001 || horizontalSplay > 0.001) {
          const originalLength = Math.hypot(gradientX, gradientY);
          gradientX *= 1 - verticalSplay;
          gradientY *= 1 - horizontalSplay;
          const splayedLength = Math.hypot(gradientX, gradientY);
          if (splayedLength > 0.001) {
            const lengthCorrection = originalLength / splayedLength;
            gradientX *= lengthCorrection;
            gradientY *= lengthCorrection;
          }
        }
      }

      let bevelMix = 1;
      if (edgeFalloff) {
        const innerDistance = roundedRectSdf(
          x,
          y,
          innerHalfWidth,
          innerHalfHeight,
          innerRadius,
        );
        bevelMix = 0.5 * (1 + erf(innerDistance * falloffScale));
      }

      imageData.data[index] = Math.round((0.5 - 0.5 * gradientX * bevelMix) * 255);
      imageData.data[index + 1] = Math.round(
        (0.5 - 0.5 * gradientY * bevelMix) * 255,
      );

      if (hasSpecular) {
        const diagonal = Math.abs(
          clamp(x / lensHalfWidth, -1, 1) * specularCos +
            clamp(y / lensHalfHeight, -1, 1) * specularSin,
        );
        let specular = 0;
        if (glowStrength > 0) {
          const glow =
            glowRange > 0.001
              ? clamp((diagonal - glowStart) / glowRange, 0, 1)
              : 0;
          specular += glowStrength * Math.pow(glow, glowExponent) * bevelMix;
        }
        if (edgeStrength > 0) {
          const edge =
            outerDistance < 0 ? Math.max(0, 1 + outerDistance / edgeWidth) : 0;
          specular +=
            edgeStrength * edge * Math.pow(diagonal, edgeExponent) * bevelMix;
        }
        imageData.data[index + 2] = Math.round(127 * Math.min(1, specular) + 128);
      } else {
        imageData.data[index + 2] = 128;
      }

      imageData.data[index + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export function mapScaleMatrix(scaleX: number, scaleY: number) {
  return `${scaleX} 0 0 0 ${0.5 * (1 - scaleX)}
          0 ${scaleY} 0 0 ${0.5 * (1 - scaleY)}
          0 0 1 0 0
          0 0 0 1 0`;
}
