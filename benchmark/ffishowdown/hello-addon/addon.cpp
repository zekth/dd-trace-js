#include <node.h>
#include "../hello/hello.h"

#define V8STR(stuff) String::NewFromUtf8(isolate, stuff, v8::NewStringType::kNormal).ToLocalChecked()

namespace hello_module {
  using v8::Value;
  using v8::FunctionCallbackInfo;
  using v8::Array;
  using v8::Number;
  using v8::String;
  using v8::Object;
  using v8::Isolate;
  using v8::Local;
  using v8::Context;

  void Hello(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();


    Local<Context> context = isolate->GetCurrentContext();
    auto arr = args[0].As<Array>();
    size_t len = arr->Length();
    thinglist tlist;
    tlist.things_len = len;
    thing * things = (thing*)malloc(sizeof(thing) * len);
    tlist.things = things;
    size_t i;
    auto text_str = V8STR("text");
    auto num_str = V8STR("num");
    for (i = 0; i < len; i++) {
      auto obj = arr->Get(context, i).ToLocalChecked().As<Object>();
      String::Utf8Value utftext(isolate, obj->Get(context, text_str).ToLocalChecked().As<String>());
      const char * text = *utftext;
      uint32_t num = obj->Get(context, num_str).ToLocalChecked().As<Number>()->Value();
      *(things + i) = { num, text };
    }
    uint32_t result = hello(&tlist);
    free(things);

    args.GetReturnValue().Set(Number::New(isolate, result));
  }

  void Initialize(Local<Object> exports) {
    NODE_SET_METHOD(exports, "hello", Hello);
  }

  NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)
}
