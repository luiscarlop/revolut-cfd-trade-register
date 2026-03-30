import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "./supabaseClient";

export default function AuthPage() {
    return (
        <div style={{ maxWidth: 400, margin: '4rem auto', padding: '2rem' }}>
            <h2 style={{ color: '#f1f5f9', marginBottom: '1.5rem' }}>
                CFD Trade Register
            </h2>
            <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                theme="dark"
                providers={[]}
            />
        </div>
    )
}