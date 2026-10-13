// this is global store 

import { jwtDecode } from 'jwt-decode';
import {create} from 'zustand';  

// for persistance 
let access_token = localStorage.getItem('access_token');
let current_user = null;
if(access_token){
    let decodedPayload = jwtDecode<User>(access_token)

     const user: User = {
                        id:decodedPayload.id,
                        first_name:decodedPayload.first_name,
                        last_name:decodedPayload.last_name,
                        email:decodedPayload.email,
                        session_exp:decodedPayload.session_exp,
                        
                    }; 

    current_user=user;
}else{

}
export interface User{ 
    id:number; 
    first_name:string; 
    last_name: string; 
    email: string;
    session_exp: number// make it to seconds please
} 

export interface AuthStore {
    user: User | null; 
    token: string | null; 
    isAuthenticated: boolean; 
    login: (user:User,token:string)=>void; 
    logout: ()=>void;
} 

// now exporting the authStore for all uses 

export const useAuthStore =create<AuthStore>(
    (set)=>({

    user:current_user,
    token: access_token,
    isAuthenticated: !!localStorage.getItem('access_token'), 

    login:(user,token)=>{
        localStorage.setItem('access_token',token) 
        set({user,token,isAuthenticated:true});
    },

    logout:()=>{
        localStorage.removeItem('access_token') 
        set({user:null,token:null,isAuthenticated:false})
        window.location.href ="/signin";
    },
}));