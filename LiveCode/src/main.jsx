import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { AuthContextProvider } from "./contexts/authContext.jsx";
import "./index.css";

/* 
1) createRoot
 - it is a function imported from "react-dom/client" module or file
 - it gives control of the DOM element to the react for rendering
 - takes DOM element as a parameter
 - return an object with two functions (render(), unmount())
 - render funtion is used to pass react component to render
 - unmount function to remove the rendered root

2) StrictMode
 - it is a component imported from "react" module or file
 - it finds bugs on re-render and re-mounting of the component by mounting->unmounting->mounting app component.
 - if i am setting a time interval in an effect and not releasing it, bug will be found in second mount.
 
3) BrowserRouter
 - it is a component imported from "react-router-dom" module or file
 - it connects browser's url bar with react so on change of url it doesn't reload the page instesd it loads another UI. 
*/

createRoot(document.getElementById("root")).render(
  // <StrictMode>
  <AuthContextProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AuthContextProvider>,
  // </StrictMode>,
);
