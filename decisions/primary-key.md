# Primary key

The `primaryKey()` function has been abolished in favor of internal record ID. Every record gets assigned a random immutable UUID upon its creation. The library uses those internal IDs primarily for associating records with each other in relations. The user is free to treat any of the defined model properties as a "primary key", but no such functionality longer exists in the library.
