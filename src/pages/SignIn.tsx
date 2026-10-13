import { useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from '@/components/ui/button'; 
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; 
import { Label } from '@/components/ui/label';
import { apiClient } from "@/api/client";
import type { User } from '@/store/useAuthStore';
import { jwtDecode } from 'jwt-decode';

export default function SignIn() {
    const [email, setEmail] = useState(''); 
    const [password, setPassword] = useState(''); 
    const [error, setError] = useState('');
    const login = useAuthStore((state) => state.login); 
    const navigate = useNavigate(); 

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();  

        try {
            const response = await apiClient.post('/auth/login', {
                email: email, 
                password: password,
            });  

            let access_token = response.data.access_token; 
            const decodedPayload = jwtDecode<User>(access_token); 

            const user: User = {
                id: decodedPayload.id, 
                first_name: decodedPayload.first_name,
                last_name: decodedPayload.last_name,
                email: decodedPayload.email,
                session_exp: decodedPayload.session_exp
            };  

            login(user, access_token); 
            navigate('/dashboard');
        } catch (e) {
            setError("Login failed, Please check your email and password");
        }
    }

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50 p-4"> 
            <Card className="w-full max-w-sm shadow-xl border border-gray-100 bg-white">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900">Sign In</CardTitle>
                    <CardDescription className="text-gray-500">Enter your details to access the dashboard</CardDescription>
                </CardHeader> 

                <CardContent>
                    <form onSubmit={handleSignIn} className="flex flex-col gap-5">
                        {error && (<div className="text-red-500 text-sm font-medium">{error}</div>)} 

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="email" className="text-gray-700">Email</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                className="text-gray-900 bg-white border-gray-300"
                                required 
                            />
                        </div> 

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="password" className="text-gray-700">Password</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className="text-gray-900 bg-white border-gray-300"
                                required 
                            />
                        </div> 

                        <Button type="submit" className="mt-2 bg-green-600 hover:bg-green-700 text-white font-medium">
                            Login
                        </Button> 

                        <div className="text-center text-sm text-gray-600 mt-4">
                            Don't have an account? <Link to="/signup" className="text-blue-600 hover:underline font-medium">Sign up here</Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}