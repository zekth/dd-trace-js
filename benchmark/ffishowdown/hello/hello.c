#include "hello.h"

uint32_t hello(thinglist * list) {
  size_t len = list->things_len;
  thing * thing_ptr = list->things;

  uint32_t total = 0;
  size_t i = 0;
  for (i = 0; i < len; i++) {
    total += (thing_ptr + i)->num;
  }
  return total;
}
