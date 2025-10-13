# 🧙‍♂️ Dobby  
Project developed as part of the *Software Engineering* course.

---

## 📖 Project Description  
Dobby is a web-based media recommendation platform designed to help users discover new movies and TV shows based on their preferences, watch history, and community interactions.  
The system integrates a **Next.js frontend**, a **Python FastAPI microservice** for personalized recommendations, and a **Supabase backend** for authentication, data storage, and user management.

**Key features include:**
- Personalized content recommendations.  
- User-friendly interface with modern UI components built using Tailwind CSS and shadcn/ui.  
- Secure authentication and data management through Supabase.  
- Integration with external APIs (e.g., TMDB) for movie and series data.  
- Modular architecture that allows scalable development and deployment.

---

## ⚙️ Functional Requirements  
1. **User Authentication & Profiles**  
   - Users can register, log in, and manage their profiles.  
   - Store user preferences and interaction history.  

2. **Media Browsing & Search**  
   - Users can search for movies and TV shows.  
   - Fetch and display metadata (title, poster, genre, rating) via the TMDB API.  

3. **User interactivy**  
   - Users are able to send messages and recommend movies/shows to each other.  

     
4. **Recommendation System**  
   - Generate personalized movie recommendations based on user history and similarity metrics.  
   - Python microservice handles data processing and returns recommendations via REST API.  

5. **Favorites & Watchlist Management**  
   - Users can add media to their favorites or watchlist.  
   - Data synchronized with Supabase backend.  

6. **Responsive Frontend**  
   - Modern and accessible UI built in Next.js with responsive design for mobile and desktop.  

---

## 🧰 Technologies  
* [![Next][Next.js]][Next-url]
* [![React][React.js]][React-url]
* [![Supabase][Supabase]][Supabase-url]
* [![FastAPI][FastAPI]][FastAPI-url]
* [![Shadcn][Shadcn]][Shadcn-url]
---

## 👥 Team Members  
> **Matija Akrap** – matija.akrap@fer.unizg.hr  
> **Jurica Šlibar** – jurica.slibar@fer.unizg.hr  
> **Fran Kramberger** – fran.kramberger@fer.unizg.hr  
> **Luka Volarević** – luka.volarevic@fer.unizg.hr  
> **Helena Floreani** – helena.floreani@fer.unizg.hr  
> **Nora Milolović** – nora.milolovic@fer.unizg.hr  
> **David Grabovac** – david.grabovac@fer.unizg.hr  

---

## 📝 License  
> Valid (1)  
> [![CC BY-NC-SA 4.0][cc-by-nc-sa-shield]][cc-by-nc-sa]  

> This repository contains *Open Educational Resources (OER)* and is licensed under the Creative Commons license, allowing you to use and share the material under the following terms:
> Attribution must be given to the authors,  
> Commercial use is not permitted,  
> Derivative works must be shared under the same license.  
>  
> [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License][cc-by-nc-sa]




[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Supabase]: https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white
[Supabase-url]: https://supabase.com/
[FastAPI]: https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi
[FastAPI-url]: https://fastapi.tiangolo.com/
[Shadcn]: https://img.shields.io/badge/shadcn%2Fui-000?logo=shadcnui&logoColor=fff&style=for-the-badge
[Shadcn-url]: https://ui.shadcn.com/
[cc-by-nc-sa]: http://creativecommons.org/licenses/by-nc-sa/4.0/  
[cc-by-nc-sa-shield]: https://licensebuttons.net/l/by-nc-sa/4.0/80x15.png
