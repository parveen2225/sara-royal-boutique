import { type ReactNode, useRef } from "react";
import "./CommonHeading.scss";

type CommonHeadingProps = {
  center?: boolean;
  title?: ReactNode;
  text?: ReactNode;
};

const CommonHeading = ({ center, title, text }: CommonHeadingProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      className={`common_heading ${center ? "text-center" : ""}`}
      ref={containerRef}
    >
      {title && (
        <div>
          <h2 className="black-gradient-text">{title}</h2>
        </div>
      )}
      {text && <p>{text}</p>}
    </div>
  );
};

export default CommonHeading
