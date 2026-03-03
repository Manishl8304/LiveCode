const API_BASE = import.meta.env.VITE_BACKEND_URL;

export const sendOtp = async (email) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", //necessary to tell server about datatype
    },
    body: JSON.stringify({ email }), //stringify converts object into json
  });

  const data = await res.json(); //converts json into js object

  // this need to be done beacause fetch treats 400/500 as resolves and rejects only server error, network failure
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
};

export const verifyOtp = async (email, otp) => {
  const res = await fetch(`${API_BASE}/auth/verifyOtp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", //necessary to tell server about datatype
    },
    credentials: "include", //necessary while using cookies
    body: JSON.stringify({ email, otp }),
  });

  const data = await res.json(); //converts json into js object

  // this need to be done beacause fetch treats 400/500 as resolves and rejects only server error, network failure
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
};

export const me = async () => {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    credentials: "include", //necessary while using cookies
  });

  const data = await res.json(); //converts json into js object

  // this need to be done beacause fetch treats 400/500 as resolves and rejects only server error, network failure
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
};
