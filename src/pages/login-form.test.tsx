import { LoginForm } from "./login-form";
import { AuthProvider } from "../context/AuthContext";
import * as AuthContext from "../context/AuthContext";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {describe, it, expect, vi, beforeEach, test } from "vitest";
import '@testing-library/jest-dom';
import { CardContent, CardDescription, CardFooter, CardHeader } from "../components/ui/card";
import { Check } from "lucide-react";


// MOCK DEPENDENCIES
let mockUseAuth = vi.fn();
vi.mock("../context/AuthContext");

//mock user data
const mockUser = {
    id: "123123321",
    username: "testuser",
    global_name: "myglobalname",
    email: "test@test.com",
    avatar: null,
  };

// mock useAuth from AuthContext
vi.mock("../context/AuthContext", async (importOriginal) => {
    const actual: any = await importOriginal();
    return {
        ...actual,
        useAuth: vi.fn(() => ({
            user: null,
            isLoading: false,
            checkAuthStatus: vi.fn(),
            logout: vi.fn(),
        })),
    };
});

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

describe("LoginForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // #1 TEST LOGIN BUTTON APPEARS WHEN NOT LOGGED IN 
    it("shows 'Continue with Discord' button when user not logged in", () => {
        render(<LoginForm />);
        
        const button = screen.getByRole("button", { name: /continue with Discord/i });
        expect(button).toBeInTheDocument();
        expect(button).not.toBeDisabled();
        expect(screen.getByTestId("discord-logo")).toBeInTheDocument();
    });

    // #2 TEST LOGIN BUTTON DISABLED WHEN CLICKED
    it("shows disabled button that says 'Connecting...' state when testLoading is true", () => {
        render(<LoginForm testLoading={true} />);

        const button = screen.getByRole("button");
        expect(button).toBeInTheDocument();
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent(/connecting/i);
    });

    
    // #3 TEST LOGGED IN UI
    it("renders logged-in UI when user exists", () => {
        

        vi.spyOn(AuthContext, "useAuth").mockReturnValue({
            user: mockUser,
            checkAuthStatus: vi.fn(),
            logout: vi.fn(),
        } as any);

        render(<LoginForm />);

        // User info
        expect(screen.getByText(/testuser/i)).toBeInTheDocument();
        expect(screen.getByText(/test@test.com/i)).toBeInTheDocument();

        // Buttons
        expect(screen.getByText(/view profile data/i)).toBeInTheDocument();
        expect(screen.getByText(/view connections/i)).toBeInTheDocument();
        expect(screen.getByText(/logout/i)).toBeInTheDocument();
    });


});