import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';


export function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null; // No renderiza nada visualmente, solo hace el trabajo sucio en el fondo
}