import { type ReactNode, useState } from "react";
import {
  UIBasicComponent,
  LayoutComponent,
  type PaddingType,
} from "./UIComponent";
import { Color, Vector3 } from "three";

type UIRowProps = {
  children?: UIBasicComponent[];
  verticalAlignment?: VerticalAlignment;
  padding?: number | PaddingType;
  background?: Color;
  id?: string;
};

export default class UIRowComponent extends LayoutComponent {
  verticalAlignment: VerticalAlignment;
  background: Color;
  constructor(props: UIRowProps) {
    super(props.padding, props.id);
    if (props.background) {
      this.background = props.background;
    } else {
      this.background = new Color(0xffffff);
    }
    if (props.children) {
      this.children = props.children;
    }
    if (props.verticalAlignment !== undefined) {
      this.verticalAlignment = props.verticalAlignment;
    } else {
      this.verticalAlignment = VerticalAlignment.Middle;
    }
    this.calculateDimensions();
  }
  getWidth = () => {
    let width = this.paddingLeft + this.paddingRight;
    this.children.forEach((item) => {
      item.calculateDimensions();
      width += item.width;
    });
    return width;
  };
  getHeight = () => {
    let height = this.paddingTop + this.paddingBottom;
    let maxChildHeight = 0;
    this.children.forEach((item) => {
      item.calculateDimensions();
      maxChildHeight = Math.max(maxChildHeight, item.height);
    });
    return height + maxChildHeight;
  };
  getComponent = (position: Vector3, updateParent: () => void) => {
    return RowUIComponent(this, position, updateParent);
  };
}

function RowUIComponent(
  component: UIRowComponent,
  position: Vector3,
  updateParent: () => void
) {
  const [width, setWidth] = useState(component.width);
  const [height, setHeight] = useState(component.height);

  function updateSize() {
    setHeight(component.height);
    setWidth(component.width);
    updateParent();
  }

  function ChildrenComponents() {
    let children: ReactNode[] = [];
    let currentXPosition = -width / 2 + component.paddingLeft;
    for (let i = 0; i < component.children.length; i++) {
      let child = component.children[i];
      let relativeXPosition = currentXPosition + child.width / 2;
      currentXPosition += child.width;
      let relativeYPosition = 0;
      if (component.verticalAlignment === VerticalAlignment.Top) {
        relativeYPosition = (height - child.height) / 2 - component.paddingTop;
      } else if (component.verticalAlignment === VerticalAlignment.Bottom) {
        relativeYPosition =
          -(height - child.height) / 2 + component.paddingBottom;
      }
      let childPosition = new Vector3(relativeXPosition, relativeYPosition, 0);
      children.push(
        <group key={"component_" + component.id + "child_" + i}>
          {child.getComponent(childPosition, updateSize)}
        </group>
      );
    }
    return <group key={"children_" + component.id}>{children}</group>;
  }
  return (
    <mesh key={"component_" + component.id} position={position}>
      <mesh position={new Vector3(0, 0, -component.layer / 1000)}>
        <boxGeometry args={[width, height, 0]} />
        <meshStandardMaterial color={component.background} />
      </mesh>
      <ChildrenComponents />
    </mesh>
  );
}

export enum VerticalAlignment {
  Top,
  Middle,
  Bottom,
}
