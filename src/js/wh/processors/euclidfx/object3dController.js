import {
  EllipseCurve,
  BufferGeometry,
  Geometry,
  LineBasicMaterial,
  Shape,
  ShapeGeometry,
  Vector3,
} from '../../../lib/three.module.js';
import { getThemeColors } from '../../state/selectors.js';
import createObject3dControllerBase from '../../webgl/object3dControllerBase.js';
import { getEuclidPattern, rotateEuclidPattern } from './euclid.js';
import { PPQN } from '../../core/config.js';
import {
  createCircleOutline,
  createCircleOutlineFilled,
} from '../../webgl/util3d.js';

const TWO_PI = Math.PI * 2;

export function createObject3dController(specs, my) {
  let that,
    centreCircle3d,
    centreDot3d,
    select3d,
    pointer3d,
    necklace3d,
    defaultColor,
    lineMaterial,
    duration,
    pointerRotation,
    pointerRotationPrevious = 0,
    status = true,
    euclid,
    steps,
    rotation,
    scale = 0.2,
    radius = 70 * scale,
    centerRadius = 20 * scale,
    selectRadius = 15 * scale,
    innerRadius = 30 * scale,
    outerRadius = 46 * scale,
    dotRadius = 10 * scale,
    locatorLength = 38 * scale,
    zeroMarkerRadius = 2 * scale,
    zeroMarkerY = radius - centerRadius - zeroMarkerRadius - 3 * scale,
    pointerCanvasCenter = centerRadius,
    locatorTop = radius - pointerCanvasCenter - locatorLength,
    doublePI = Math.PI * 2,

    initialize = function() {
      centreCircle3d = my.object3d.getObjectByName('centreCircle'),
      centreDot3d = my.object3d.getObjectByName('centreDot'),
      select3d = my.object3d.getObjectByName('select'),
      pointer3d = my.object3d.getObjectByName('pointer'),
      necklace3d = my.object3d.getObjectByName('necklace'),

      document.addEventListener(my.store.STATE_CHANGE, handleStateChanges);
    
      defaultColor = getThemeColors().colorHigh;
      lineMaterial = new LineBasicMaterial({
        color: defaultColor,
      });

      const params = specs.processorData.params.byId;
      my.updateLabel(params.name.value);
      updateNecklace(params.steps.value, params.pulses.value, params.rotation.value);
      updateDuration(params.steps.value, params.rate.value);
      updateRotation(params.rotation.value);  
      updatePointer();
    },

    terminate = function() {
      document.removeEventListener(my.store.STATE_CHANGE, handleStateChanges);
    },

    handleStateChanges = function(e) {
      switch (e.detail.action.type) {
        case e.detail.actions.CHANGE_PARAMETER:
          if (e.detail.action.processorID === my.id) {
            let params = e.detail.state.processors.byId[my.id].params.byId;
            switch (e.detail.action.paramKey) {
              case 'steps':
              case 'pulses':
                updateDuration(params.steps.value, params.rate.value);
                updateNecklace(params.steps.value, params.pulses.value, params.rotation.value);
                break;
              case 'rotation':
                updateRotation(params.rotation.value);  
                break;
              default:
            }
          }

        case e.detail.actions.DRAG_SELECTED_PROCESSOR:
          my.updatePosition(e.detail.state);
          break;

        case e.detail.actions.SET_THEME:
          updateTheme();
          break;
      }
    },

    updateNecklace = function(numSteps, pulses, rotation, isMute = false) {
      steps = numSteps;

      // create the pattern
      euclid = getEuclidPattern(steps, pulses);
      euclid = rotateEuclidPattern(euclid, rotation);
      
      necklace3d.geometry.dispose();
      // necklace3d.geometry = new Geometry();
      // necklace3d.geometry.vertices.push(
      //   new Vector3(0, 0),
      //   new Vector3(0, locatorTop),
      // );
      for (let i = 0, n = euclid.length; i < n; i++) {
        const stepRadius = euclid[i] ? outerRadius : innerRadius;
        // rotateCtx.arc(radius, radius, stepRadius, ((i / n) * doublePI) - (Math.PI / 2), (((i + 1) / n) * doublePI) - (Math.PI / 2), false);

        const curve = new EllipseCurve(
          0,  0, // ax, aY
          stepRadius, stepRadius, // xRadius, yRadius
          ((i / n) * doublePI) - (Math.PI / 2), // aStartAngle
          (((i + 1) / n) * doublePI) - (Math.PI / 2), // aEndAngle
          false, // aClockwise,
          0, // aRotation
        );
        const points = curve.getPoints(5);
        const geometry = new BufferGeometry().setFromPoints(points);
        necklace3d.geometry = geometry;
      }
    },

    updateRotation = function(numRotation) {
      rotation = numRotation;
    },

    /**
     * Redraw the location pointer and the status dot.
     */
    updatePointer = function() {
      const necklacePos = radius - (status ? outerRadius : innerRadius)
      const halfWayPos = necklacePos + ((locatorTop - necklacePos) / 2);
      const statusWidth = status ? 15 * scale : 6 * scale;
      const sides = status ? locatorTop : halfWayPos;

      pointer3d.geometry.dispose();
      pointer3d.geometry = new Geometry();

      // position locator
      pointer3d.geometry.vertices.push(
        new Vector3(pointerCanvasCenter, radius - pointerCanvasCenter),
        new Vector3(pointerCanvasCenter, locatorTop),
      );

      // status indicator
      pointer3d.geometry.vertices.push(
        new Vector3(pointerCanvasCenter - statusWidth, sides),
        new Vector3(pointerCanvasCenter, necklacePos),
        new Vector3(pointerCanvasCenter + statusWidth, sides),
        new Vector3(pointerCanvasCenter, locatorTop),
      );

      // pointerCtx.clearRect(0, 0, pointerCtx.canvas.width, pointerCtx.canvas.height);
      // pointerCtx.beginPath();

      // // position locator
      // pointerCtx.moveTo(pointerCanvasCenter, radius - pointerCanvasCenter);
      // pointerCtx.lineTo(pointerCanvasCenter, locatorTop);

      // // status indicator
      // pointerCtx.lineTo(pointerCanvasCenter - statusWidth, sides);
      // pointerCtx.lineTo(pointerCanvasCenter, necklacePos);
      // pointerCtx.lineTo(pointerCanvasCenter + statusWidth, sides);
      // pointerCtx.lineTo(pointerCanvasCenter, locatorTop);

      // pointerCtx.stroke();
    },

    /** 
     * Set theme colors on the 3D pattern.
     */
    updateTheme = function() {
      const themeColors = getThemeColors();
      setThemeColorRecursively(my.object3d, themeColors.colorHigh);
    },

    /** 
     * Loop through all the object3d's children to set the color.
     * @param {Object3d} An Object3d of which to change the color.
     * @param {String} HEx color string of the new color.
     */
    setThemeColorRecursively = function(object3d, color) {
      if (object3d.material && object3d.material.color) {
        object3d.material.color.set( color );
      }
      object3d.children.forEach(childObject3d => {
        setThemeColorRecursively(childObject3d, color);
      });
    },
            
    /**
     * Update the hitarea used for mouse detection.
     */
    updateHitarea = function() {
        const scale = (radius3d + 3) * 0.1;
        my.hitarea3d.scale.set(scale, scale, 1);
    },

    updateLabelPosition = function() {
      my.label3d.position.y = -radius3d - 2;
    },

    /**
     * Show circle if the processor is selected, else hide.
     * @param {Boolean} isSelected True if selected.
     */
    updateSelectCircle = function(selectedId) {
      select3d.visible = my.id === selectedId;
    },

    /**
     * Calculate the pattern's duration in milliseconds.
     */
    updateDuration = function(steps, rate) {
      // const rate = my.params.is_triplets.value ? my.params.rate.value * (2 / 3) : my.params.rate.value;
      const stepDuration = rate * PPQN;
      duration = steps * stepDuration;
    },
        
    /**
     * Show the playback position within the pattern.
     * Indicated by the necklace's rotation.
     * @param  {Number} position Position within pattern in ticks.
     */
    showPlaybackPosition = function(position) {
        pointerRotationPrevious = pointerRotation;
        pointerRotation = TWO_PI * (-position % duration / duration);
        necklace3d.rotation.z = pointerRotation;
    },

    /**
     * Redraw the pattern if needed.
     * @param {Number} position Transport playback position in ticks.
     * @param {Array} processorEvents Array of processor generated events to display.
     */
    draw = function(position, processorEvents) {
      showPlaybackPosition(position);

      // calculate status and redraw locator if needed
      let currentStep = Math.floor(((position % duration) / duration) * steps);
      currentStep = (currentStep + rotation) % steps;
      const currentStatus = euclid[currentStep];
      if (currentStatus !== status) {
        status = currentStatus;
        updatePointer();
      }
    };
  
  my = my || {};

  that = createObject3dControllerBase(specs, my);

  initialize();

  that.terminate = terminate;
  that.updateSelectCircle = updateSelectCircle;
  that.draw = draw;
  return that;
}