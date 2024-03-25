
import './Image.css';

export const Image = ({src, alt}) => {
    return (
        <img className="image" src={src} alt={alt} />
    );
};
