// src/sprites/animatedSprite.ts

export interface AnimationProperties {
    orientation: 'down' | 'up' | 'left' | 'right';
    offsetX: number;
    offsetY: number;
    isWalkingFrame: boolean;
  }
  
  /**
   * getAnimationProperties
   * ------------------------
   * Given the object's movement type, its defined facingDirection,
   * and a global animation counter, return:
   *
   * - orientation: For bidirectional movement (UP_DOWN or LEFT_RIGHT) this alternates
   *   between the two allowed directions.
   * - offsetX / offsetY: A pixel offset to “slide” the sprite gradually by up to 16px.
   * - isWalkingFrame: A boolean flag that you then pass into processSprite so that the
   *   walking midframe is shown.
   *
   * The period is hard–coded (here, 8 ticks) so that the sprite “bobs” smoothly.
   */
  export function getAnimationProperties(
    movement: string,
    facingDirection: string | null,
    animCounter: number
  ): AnimationProperties {
    let orientation: 'down' | 'up' | 'left' | 'right' = 'down';
    let offsetX = 0,
      offsetY = 0;
    let isWalkingFrame = false;
  
    if (movement === "WALK") {
      // Toggle walking frame every other tick.
      isWalkingFrame = (animCounter % 2) === 1;
      if (facingDirection === "UP_DOWN") {
        // Alternate between "up" and "down"
        orientation = (animCounter % 2 === 0) ? "up" : "down";
        // Use a simple triangle wave over a period of 8 ticks:
        const period = 8;
        const phase = animCounter % period;
        // When facing up, move upward (negative Y offset); when down, move downward.
        offsetY =
          orientation === "up"
            ? -Math.round((phase / (period / 2)) * 16)
            : Math.round((phase / (period / 2)) * 16);
      } else if (facingDirection === "LEFT_RIGHT") {
        // Alternate between "left" and "right"
        orientation = (animCounter % 2 === 0) ? "left" : "right";
        const period = 8;
        const phase = animCounter % period;
        offsetX =
          orientation === "left"
            ? -Math.round((phase / (period / 2)) * 16)
            : Math.round((phase / (period / 2)) * 16);
      } else if (facingDirection && facingDirection !== "NONE") {
        // If a specific direction is provided, use it.
        orientation = facingDirection.toLowerCase() as 'down' | 'up' | 'left' | 'right';
        isWalkingFrame = true;
      } else {
        orientation = "down";
      }
    } else {
      // Not walking: simply use the defined facingDirection (if any)
      if (facingDirection && facingDirection !== "NONE") {
        orientation = facingDirection.toLowerCase() as 'down' | 'up' | 'left' | 'right';
      }
    }
    return { orientation, offsetX, offsetY, isWalkingFrame };
  }