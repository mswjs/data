[standard-schema]: https://standardschema.dev/

<p align="center">
  <img src="logo.svg" alt="Data logo" width="124" />
</p>
<h1 align="center"><code>@msw/data</code></h1>
<p align="center">Data querying library for testing JavaScript applications.</p>

## Motivation

This library exists to help developers model and query data when testing and developing their applications. It acts as a convenient way of creating schema-based fixtures and querying them with a familiar ORM-inspired syntax. It can be used standalone or in conjuncture with [Mock Service Worker](https://mswjs.io) for seamless mocking experience both on the network and the data layers.

## Features

- Relies on [Standard Schema][standard-schema] instead of inventing a proprietary modeling syntax you have to learn. You can use any Standard Schema-compliant object modeling library to describe your data, like Zod, ArkType, Valibot, yup, and many others.
- Full runtime and type-safety.
- Provides a powerful querying syntax (inspired by Prisma);
- Supports relations for database-like behaviors (inspired by Drizzle);
- Supports extensions (including custom extensions) for things like cross-tab collection synchronization or record persistence.

## Documentation

Read the [documentation](https://mswjs.io/ecosystem/data).
