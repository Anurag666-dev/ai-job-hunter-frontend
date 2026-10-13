import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { apiClient } from "@/api/client";
import type { User } from '@/store/useAuthStore';
import { jwtDecode } from 'jwt-decode'; 
import { useNavigate, Link } from 'react-router-dom'; 

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label'; 
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'; 
import { Input } from '@/components/ui/input'; 

export default function SignUp() { 
    const [first_name, setFirstName] = useState(''); 
    const [last_name, setLastName] = useState('');
    const [email, setEmail] = useState(''); 
    const [password, setPassword] = useState(''); 
    const [error, setError] = useState('');

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    // Handling the signup 
    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); 

        try {
            const response = await apiClient.post("/auth/register", {
                first_name: first_name,
                last_name: last_name,
                email: email,
                password: password
            }); 

            if (response) {
                if (response.data.type === "error") {
                    throw new Error(response.data.message);
                } else {
                    let access_token = response.data.access_token; 
                    const decodedPayload = jwtDecode<User>(access_token); 

                    const user: User = {
                        id: decodedPayload.id,
                        first_name: decodedPayload.first_name,
                        last_name: decodedPayload.last_name,
                        email: decodedPayload.email,
                        session_exp: decodedPayload.session_exp,
                    }; 

                    login(user, access_token);
                    navigate('/dashboard');
                }
            } else {
                throw new Error('Got no response from server, please try again later');
            }
        } catch (err) {
            setError('Signup failed, please check your connection or ' + err);
        }
    };

    return (
        <div className='flex flex-col h-screen items-center justify-center bg-gray-50 p-4'>
            <Card className='w-full max-w-md shadow-xl border border-gray-100 bg-white'>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900">Create Account</CardTitle>
                    <CardDescription className='text-gray-500'>Join the AI Job Hunter Platform.</CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSignUp} className='flex flex-col gap-4'>
                        {error && (<div className="text-red-500 text-sm font-medium">{error}</div>)} 

                        {/* First and Last Name Row */}
                        <div className='flex gap-4'>
                            <div className="flex flex-col gap-2 w-full">
                                <Label htmlFor='firstName' className="text-gray-700">First Name</Label>
                                <Input 
                                    id="firstName" 
                                    value={first_name} 
                                    onChange={(e) => setFirstName(e.target.value)} 
                                    className="text-gray-900 bg-white border-gray-300"
                                    required 
                                />
                            </div>

                            <div className="flex flex-col gap-2 w-full">
                                <Label htmlFor="lastName" className="text-gray-700">Last Name</Label>
                                <Input 
                                    id="lastName" 
                                    value={last_name} 
                                    onChange={(e) => setLastName(e.target.value)} 
                                    className="text-gray-900 bg-white border-gray-300"
                                    required 
                                />
                            </div>
                        </div> 

                        {/* Email and Password Row */}
                        <div className='flex gap-4'>
                            <div className="flex flex-col gap-2 w-full">
                                <Label htmlFor='email' className="text-gray-700">Email</Label>
                                <Input 
                                    id="email" 
                                    type="email"
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    className="text-gray-900 bg-white border-gray-300"
                                    required 
                                />
                            </div> 

                            <div className="flex flex-col gap-2 w-full">
                                <Label htmlFor='password' className="text-gray-700">Password</Label>
                                <Input 
                                    id="password" 
                                    type="password"
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    className="text-gray-900 bg-white border-gray-300"
                                    required 
                                /> 
                            </div>
                        </div> 

                        <Button type="submit" className="mt-4 bg-green-600 hover:bg-green-700 text-white font-medium w-full">
                            Create Account
                        </Button>
                    </form> 

                    <div className="text-center text-sm text-gray-600 mt-5">
                        Already have an account? <Link to="/signin" className="text-blue-600 hover:underline font-medium">Sign in here</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}