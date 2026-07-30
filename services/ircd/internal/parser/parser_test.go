package parser

import (
	"reflect"
	"testing"
)

func TestParseLine(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		want    *Message
		wantErr error
	}{
		{
			name: "Simple command with one param",
			raw:  "NICK Eran\r\n",
			want: &Message{
				Prefix:  "",
				Command: "NICK",
				Params:  []string{"Eran"},
			},
			wantErr: nil,
		},
		{
			name: "Command with prefix and multiple params",
			raw:  ":Eran!user@host PRIVMSG #test :Hello World!\r\n",
			want: &Message{
				Prefix:  "Eran!user@host",
				Command: "PRIVMSG",
				Params:  []string{"#test", "Hello World!"},
			},
			wantErr: nil,
		},
		{
			name: "Command with no params",
			raw:  "PING\r\n",
			want: &Message{
				Prefix:  "",
				Command: "PING",
				Params:  []string{},
			},
			wantErr: nil,
		},
		{
			name: "Command with just trailing",
			raw:  "QUIT :Goodbye everyone\n",
			want: &Message{
				Prefix:  "",
				Command: "QUIT",
				Params:  []string{"Goodbye everyone"},
			},
			wantErr: nil,
		},
		{
			name: "Empty message",
			raw:  "\r\n",
			want: nil,
			wantErr: ErrEmptyMessage,
		},
		{
			name: "Extra spaces",
			raw:  "  JOIN   #test   \r\n",
			want: &Message{
				Prefix:  "",
				Command: "JOIN",
				Params:  []string{"#test"},
			},
			wantErr: nil,
		},
		{
			name: "Prefix only (invalid)",
			raw:  ":Eran!user@host\r\n",
			want: nil,
			wantErr: ErrInvalidFormat,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseLine(tt.raw)
			if err != tt.wantErr {
				t.Errorf("ParseLine() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ParseLine() = %v, want %v", got, tt.want)
			}
		})
	}
}
