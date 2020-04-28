#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct thing {
  uint32_t num;
  const char * text;
} thing;

typedef struct thinglist {
  size_t things_len;
  thing * things;
} thinglist;

uint32_t hello(thinglist * list);

#ifdef __cplusplus
}
#endif
