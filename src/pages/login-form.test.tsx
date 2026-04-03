import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../utils/context/AuthContext";
import { LoginForm } from "./login-form";
import "@testing-library/jest-dom";

// mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// mock user data
const mockUser = {
  id: "123123321",
  username: "testuser",
  discriminator: "1234",
  global_name: "myglobalname",
  email: "test@test.com",
  avatar: null,
};

// mock discord logo
vi.mock("../assets/discord-logo.svg?react", () => ({
  default: () => <svg data-testid="discord-logo" />,
}));

// mock button component
vi.mock("../components/ui/button", () => ({
  Button: (props: any) => <button disabled={props.disabled}>{props.children}</button>,
}));

// mock card components
vi.mock("../components/ui/card", () => ({
  Card: (props: any) => <div {...props} />,
  CardContent: (props: any) => <div {...props} />,
  CardDescription: (props: any) => <div {...props} />,
  CardHeader: (props: any) => <div {...props} />,
  CardFooter: (props: any) => <div {...props} />,
  CardTitle: (props: any) => <h2 {...props} />,
}));

const renderWithAuth = (ui: ReactNode, user: typeof mockUser | null = null) => {
  return render(
    <BrowserRouter>
      <AuthProvider
        value={{
          user,
          isLoading: false,
          checkAuthStatus: vi.fn(),
          logout: vi.fn(),
        }}
      >
        {ui}
      </AuthProvider>
    </BrowserRouter>,
  );
};

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // #1 TEST LOGIN BUTTON APPEARS WHEN NOT LOGGED IN
  it("shows 'Continue with Discord' button when user not logged in", () => {
    renderWithAuth(<LoginForm />);

    // expected discord login button
    const button = screen.getByRole("button", { name: /continue with Discord/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(screen.getByTestId("discord-logo")).toBeInTheDocument();
  });

  // #2 TEST LOGIN BUTTON DISABLED WHEN CLICKED
  it("shows disabled button that says 'Connecting...' state when testLoading is true", () => {
    renderWithAuth(<LoginForm testLoading={true} />);

    // expected button disabled
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/connecting/i);
  });

  // #3 TEST LOGGED IN UI
  it("renders logged-in UI when user exists", () => {
    renderWithAuth(<LoginForm />, mockUser);

    // user info
    expect(screen.getByText(/myglobalname/i)).toBeInTheDocument();
    expect(screen.getByText(/test@test.com/i)).toBeInTheDocument();

    // buttons
    expect(screen.getByText(/view profile data/i)).toBeInTheDocument();
    expect(screen.getByText(/view connections/i)).toBeInTheDocument();
    expect(screen.getByText(/logout/i)).toBeInTheDocument();
  });
});
