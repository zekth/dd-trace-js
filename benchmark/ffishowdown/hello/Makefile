CFLAGS := -fPIC -O3 -g -Wall -Werror
NAME := hello


lib: lib$(NAME).dylib

lib$(NAME).dylib: $(NAME).o
	$(CC) -dynamiclib -o $@ $^

clean:
	$(RM) *.o *.dylib
