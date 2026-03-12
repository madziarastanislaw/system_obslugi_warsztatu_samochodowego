### System Obsługi Warsztatu Samochodowego

Projekt realizuje prostą aplikację obsługi warsztatu samochodowego.

Nie jest on zaawansowany technologicznie ani funkcjonalnie, powstał jedynie jako proof of concept.

Architektura systemu przedstawia się następująco:
Użytkownik ma dostęp do aplikacji poprzez stronę internetową (warsztat.html),
wszystkie kluczowe dane niezbędne do funkcjonowania znajdują się w bazie danych PostgreSQL o zadanej strukturze (sql.txt),
za komunikację pomiędzy tymi elementami odpowiada serwer (serwer_warsztat.js).

Aby system działał poprawnie należy:
- utworzyć bazę danych o zadanej strukturze
- zapewnić serwerowi dostęp do bazy danych (kredencjały w pliku serwera, odpowiednia lokalizacka)
- zapewnić widoczność serwera dla strony html

Poniżej widnieją przykłady interfejsu użytkownika w roli pracownika biura:

<img width="1919" height="867" alt="image" src="https://github.com/user-attachments/assets/d650f310-eb02-400a-ac59-99c48e7bc3c4" />
<img width="1919" height="866" alt="image" src="https://github.com/user-attachments/assets/c4188871-5b59-4a8a-b814-a07595c631e8" />
<img width="1917" height="868" alt="image" src="https://github.com/user-attachments/assets/5b222b53-b389-4447-bbfa-23330c2a8a37" />
<img width="1919" height="865" alt="image" src="https://github.com/user-attachments/assets/d3ccc442-f6b6-4cdb-9b6d-e7ea732252d2" />
<img width="1919" height="864" alt="image" src="https://github.com/user-attachments/assets/ae773d18-1557-4feb-b144-d6c4ee401bea" />
