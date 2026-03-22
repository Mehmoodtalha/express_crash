export type SignupBody = {
    first_name: string;
    last_name: string;
    dob: string;
    gender: string;
    address?: string;
    email: string;
    phone?: string;
    password: string;
};

export type LoginBody = {
    email: string;
    password: string;
};

export type RefreshTokenBody = {
    refresh_token: string;
};

export type RedisRefreshData = {
    userId: number;
    sessionToken: string;
};