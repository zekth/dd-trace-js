#include <assert.h>
#include <stdlib.h>
#define NAPI_VERSION 5
#include <node_api.h>
#include "../hello/hello.h"

napi_value Hello(napi_env env, napi_callback_info info) {
  napi_status status;

  size_t argc = 1;
  napi_value args[1];
  status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  assert(status == napi_ok);

  uint32_t len;
  status = napi_get_array_length(env, args[0], &len);
  assert(status == napi_ok);

  thinglist list;
  list.things_len = len;
  thing * things = (thing*)malloc(sizeof(thing)*len);
  list.things = things;

  uint32_t i;
  for (i = 0; i < len; i++) {
    napi_value obj;
    status = napi_get_element(env, args[0], i, &obj);
    assert(status == napi_ok);

    napi_value num_val;
    status = napi_get_named_property(env, obj, "num", &num_val);
    assert(status == napi_ok);

    uint32_t num;
    status = napi_get_value_uint32(env, num_val, &num);
    assert(status == napi_ok);

    napi_value text_val;
    status = napi_get_named_property(env, obj, "text", &text_val);
    assert(status == napi_ok);

    char text[256] = {0};
    size_t text_len;
    status = napi_get_value_string_utf8(env, text_val, text, 256, &text_len);
    assert(status == napi_ok);

    *(things + i) = (thing){ num, text };
  }


  napi_value result;
  uint32_t sum = hello(&list);
  status = napi_create_uint32(env, sum, &result);
  assert(status == napi_ok);

  free(things);

  return result;
}

#define DECLARE_NAPI_METHOD(name, func)                                        \
  { name, 0, func, 0, 0, 0, napi_default, 0 }

napi_value Init(napi_env env, napi_value exports) {
  napi_status status;
  napi_property_descriptor addDescriptor = DECLARE_NAPI_METHOD("hello", Hello);
  status = napi_define_properties(env, exports, 1, &addDescriptor);
  assert(status == napi_ok);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
