import {
  Group,
  LineBasicMaterial,
} from '../../../lib/three.module.js';
import {
  createCircleFilled,
  createCircleOutline,
  createCircleOutlineFilled,
  createShape,
  drawConnectors,
} from '../../webgl/draw3dHelper.js';
import { getThemeColors } from '../../state/selectors.js';

export function createObject3d(id, inputs, outputs) {
  let defaultColor,
    lineMaterial,
    
    /**
     * Initialization.
     */
    init = function() {
      defaultColor = getThemeColors().colorHigh;
      lineMaterial = new LineBasicMaterial({
        color: defaultColor,
      });
    },
    
    /**
     * Create combined Object3D of wheel.
     * @return {object} Group object3D of drag plane.
     */
    create = function() {
      const hitarea = createCircleFilled(3, defaultColor);
      hitarea.name = 'hitarea';
      hitarea.material.opacity = 0.0;
      
      const centreCircle = createCircleOutline(3, lineMaterial);
      centreCircle.name = 'centreCircle';
      
      const selectCircle = createCircleOutline(2, lineMaterial);
      selectCircle.name = 'select';
      selectCircle.visible = false;
      
      const centreDot = createCircleOutlineFilled(1.5, defaultColor);
      centreDot.name = 'centreDot';
      centreDot.visible = false;
      
      const pointer = createShape();
      pointer.name = 'pointer';
      
      const necklace = createShape();
      necklace.name = 'necklace';

      const zeroMarker = createCircleOutline(0.5, lineMaterial);
      zeroMarker.name = 'zeroMarker';
      zeroMarker.translateY(2.5);
      necklace.add(zeroMarker);

      const label = new Group();
      label.name = 'label';
      label.scale.set(0.1, 0.1, 1);
      label.translateY(-8);
      
      const root = new Group();
      root.name = 'root';
      root.userData.id = id;
      root.add(hitarea);
      root.add(centreCircle);
      root.add(selectCircle);
      root.add(centreDot);
      root.add(pointer);
      root.add(necklace);
      root.add(label);

      // add inputs and outputs
      drawConnectors(root, inputs, outputs);
      
      return root;
    };
  
  init();
  
  return create();
}
