# Wire Protocol

Rather than HTTP, the protcol here assumes a raw TCP or TLS socket stream. Data
objects sent on the wire must be big-endian C-structs in the format described in
this document.

> TODO: Is little-endian easier?
> TODO: alignment?

Upon the establishment of a TCP socket, a `process` object must be sent by the
tracer. Due to the object type and protocol version, this means that new
connections will always start with the "magic" byte sequence `DD 00 00 00 00 01`.

The `process`, `trace`, and `span` objects can have associated `metaList` and
`metricsList` objects, which must be sent immediately *after* the object they're
adding to.

> TODO: recovery when TCP connections fail.
> TODO: find a way of indicating trace completiong.

The ID types are defined in the following typedefs:

```c
typedef uint8_t[8] id_t;
typedef uint8_t[16] longid_t;
```

The representation of IDs in application code is irrelevant, as long as the byte
order is preserved.

## String Mapping

> NOTE: This whole bit is up in the air.

Strings in any of the objects are sent as `uint64_t` hash codes standing in for
actual strings. Strings are expected to be stored in an LRU-cached mapping on
both sides of the connection, whose size is established via
`process.string_cache_size`. The hash codes *must* be deterministic.

The mapping can be updated at any time (after the initial `process`
object is sent) by sending the following object:

```c
typedef id_t stringid_t;

struct string {
  uint16_t object_type = 0xdd06;
  id_t id;
  uint32_t len;
  char characters[];
}
```

Note that the agent will not be able to process any object fully until it has
mapping details for all the strings contained within it.

## meta/metrics

A `metricsList` must immediately follow a `process`/`trace`/`span`/`metaList`,
ignoring `string` placement.

A `metaList` must immediately follow a `process`/`trace`/`span`/`metricsList`,
ignoring `string` placement.

```c
struct metric {
  stringid_t name;
  double value;
}

struct metricsList {
  uint16_t object_type = 0xdd04;
  uint8_t metricsLen;
  struct metric metrics[metricsLen];
}

struct meta {
  stringid_t name;
  stringid_t value;
}

struct metaList {
  uint16_t object_type = 0xdd05;
  uint8_t metaLen;
  struct meta metas[metaLen];
}
```

## process

```c
struct process {
  uint16_t object_type = 0xdd00;
  uint32_t protocol_version = 0x00000001;
  uint64_t string_cache_size;
}
```

> TODO: Add common/mandatory process-level fields

Note that this must be the first object sent upon a new connection.

## trace

```c
struct trace {
  uint16_t object_type = 0xdd01;
  longid_t trace_id;
}
```

> TODO: Add more common/mandatory trace-level fields.

## span

```c
struct span {
  uint16_t object_type = 0xdd02;
  id_t span_id;
  id_t parent_id;
  longid_t trace_id;
  uint64_t start;     // start/duration were int64_t in the old format. but we don't actually need signed numbers here.
  uint64_t duration;
  stringid_t name;
  stringid_t type;
  stringid_t resource;
  stringid_t service;
  boolean error;
}
```

Start and duration were `int64_t` in the old format, but they don't actually
inherently need to be signed, because all events occur after the UNIX epoch and
take positive amounts of time to complete, because we don't have time machines.

> TODO: Add more common/mandatory span-level fields.
